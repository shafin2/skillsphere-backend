## SkillSphere Auth Frontend Guide (React + Vite)

This doc explains how to integrate the Node/Express auth backend into a React (Vite) frontend.

### URLs and Environment
- **API base**: `http://localhost:5000`
- **Frontend**: `http://localhost:5173`
- Backend CORS is configured to allow `CLIENT_URL` and send cookies. Always send `credentials` on calls that set/use cookies (logout, refresh).
- Suggested frontend env (e.g., `.env.local`):
  - `VITE_API_URL=http://localhost:5000`

### Auth Concepts
- **Access token** (short-lived): returned in JSON after login/signup/OAuth; include as `Authorization: Bearer <token>` for protected requests.
- **Refresh token** (long-lived): httpOnly cookie; automatically rotated on `/auth/refresh`.
- **Roles**: `learner` (default), `mentor` (requires admin approval), `admin` (seeded only; cannot signup/login via UI).
- **Email verification**: required for email/password users. Google users are auto-verified if Google returns an email.

## UX Flows

### 1) Role selection (required upfront)
- Screen 1: Ask user to choose `learner` or `mentor`.
- Persist chosen role in state (e.g., `role` in React Router location state or context) to pass to signup or Google.

### 2) Email/Password Signup
- Show form: `name`, `email`, `password`, `confirmPassword`.
- On submit POST `POST /auth/signup` with body: `{ name, email, password, confirmPassword, role }`.
- Password rules: min 8 chars, at least 1 uppercase, 1 number, 1 symbol.
- Responses:
  - learner: "Account created successfully. Please verify your email."
  - mentor: "Account created. Mentor application pending approval."
- A verification email is sent with a link to `CLIENT_URL/verify-email?token=...`.

### 3) Verify Email Page
- Route: `/verify-email` in frontend.
- Read `token` from query string, call `GET /auth/verify-email?token=...`.
- On success: redirect to Login or auto-login flow (your choice).

### 4) Login (Email/Password)
- POST `POST /auth/login` `{ email, password }`.
- Blocks:
  - If not verified: 403 with message to verify email.
  - If mentor and not approved: 403 with pending approval message.
- On success: store `accessToken` client-side; refresh token cookie is set by backend automatically.

### 5) Google OAuth
- Based on selected role, send user to:
  - Learner: `GET ${API}/auth/google?role=learner`
  - Mentor: `GET ${API}/auth/google?role=mentor`
- After Google callback, backend redirects to `CLIENT_URL/oauth-success?token=<accessToken>`.
- On that page, read the `token` query param and store as `accessToken`.
- If admin or unapproved mentor, backend redirects with an error query (handle UI accordingly).

### 6) Forgot / Reset Password
- Forgot: `POST /auth/forgot-password` with `{ email }`. Always returns success.
- Email link to frontend route: `${CLIENT_URL}/reset-password?token=...` (expires 1h).
- Reset page posts `POST /auth/reset-password` `{ token, password, confirmPassword }`.

### 7) Logout
- `POST /auth/logout` with `credentials: 'include'` to clear refresh cookie; also clear `accessToken` client-side.

### 8) Admin (future, seeded)
- Mentor moderation API (admin role required):
  - `GET /auth/admin/mentors?status=pending|approved`
  - `POST /auth/admin/mentors/:id/approve`
  - `POST /auth/admin/mentors/:id/reject`

## API Endpoints Summary
- POST `/auth/signup`
- GET `/auth/verify-email?token=...`
- POST `/auth/login`
- POST `/auth/logout`
- POST `/auth/refresh`
- POST `/auth/forgot-password`
- POST `/auth/reset-password`
- GET `/auth/me`
- GET `/auth/google?role=learner|mentor` → external redirect
- GET `/auth/google/callback` → redirects back to frontend with `token`
- Admin: GET/POST `/auth/admin/mentors...`

## Frontend Implementation Notes

### HTTP client setup (axios example)
```ts
// src/lib/http.ts
import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true // needed for refresh/logout cookie
});

// Attach access token from memory/localStorage
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let pending: Array<(t: string|null) => void> = [];

http.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {}, { withCredentials: true });
          localStorage.setItem('accessToken', data.accessToken);
          pending.forEach((fn) => fn(data.accessToken));
          pending = [];
          return http(original);
        } catch (e) {
          pending.forEach((fn) => fn(null));
          pending = [];
          localStorage.removeItem('accessToken');
          throw e;
        } finally {
          isRefreshing = false;
        }
      }
      return new Promise((resolve, reject) => {
        pending.push((token) => {
          if (!token) return reject(error);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(http(original));
        });
      });
    }
    return Promise.reject(error);
  }
);

export default http;
```

### Auth context (minimal)
```ts
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState } from 'react';

type User = { id: string; name: string; email: string; roles: string[]; isApproved?: boolean; isEmailVerified?: boolean };

const AuthCtx = createContext<{ user: User|null; setUser: (u: User|null) => void }>({ user: null, setUser: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User|null>(null);
  return <AuthCtx.Provider value={{ user, setUser }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
```

### Example: Signup
```ts
// role is chosen from prior screen
await http.post('/auth/signup', { name, email, password, confirmPassword, role });
// show message: verify email for learner; pending approval for mentor
```

### Example: Login
```ts
const { data } = await http.post('/auth/login', { email, password });
localStorage.setItem('accessToken', data.accessToken);
// optionally fetch profile
const me = await http.get('/auth/me');
```

### Example: Google buttons
```tsx
// Learner
<a href={`${import.meta.env.VITE_API_URL}/auth/google?role=learner`}>Continue with Google</a>
// Mentor
<a href={`${import.meta.env.VITE_API_URL}/auth/google?role=mentor`}>Continue with Google (Mentor)</a>
```

### OAuth success page
```ts
// /oauth-success route
const params = new URLSearchParams(location.search);
const token = params.get('token');
if (token) {
  localStorage.setItem('accessToken', token);
  // fetch profile or redirect to app
}
```

### Verify email page
```ts
const token = new URLSearchParams(location.search).get('token');
await http.get(`/auth/verify-email?token=${encodeURIComponent(token!)}`);
```

### Forgot / Reset
```ts
await http.post('/auth/forgot-password', { email });
// reset page
await http.post('/auth/reset-password', { token, password, confirmPassword });
```

### Logout
```ts
await http.post('/auth/logout');
localStorage.removeItem('accessToken');
```

### Route Guards
- Protect views by checking presence of `accessToken` and/or `GET /auth/me`.
- Mentor-only areas: ensure `user.roles.includes('mentor') && user.isApproved`.
- Admin-only pages: `user.roles.includes('admin')`.

### Error Handling Basics
- 400/409: validation, existing email, weak password
- 401: unauthenticated (will trigger refresh interceptor)
- 403: not verified, mentor pending approval, or forbidden
- 404: not found
- Show clear UI messages per backend response `message`.

### Email Links
- Backend builds links using `CLIENT_URL`:
  - Verify: `${CLIENT_URL}/verify-email?token=...` (24h)
  - Reset: `${CLIENT_URL}/reset-password?token=...` (1h)
- To change paths, either:
  - Update frontend routes to match, or
  - Adjust link construction in backend controllers.

### Checklist
- Ask for role first, then show signup/login.
- Use provided endpoints verbatim.
- Send `credentials` for logout/refresh.
- Store and attach `accessToken` in requests.
- Handle 401 with auto-refresh.
- Block UI for unverified users and unapproved mentors.
- Parse OAuth redirect token on `/oauth-success`. 