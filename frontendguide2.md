## Admin Frontend Guide (/admin)

This guide helps you implement the admin portal in React (Vite).

### Access
- Admin account is seeded (cannot sign up). Use credentials from `.env` seed vars.
- Admin logs in using the normal login endpoint.

### Routes
- Admin shell route: `/admin`
  - If not authenticated or not admin → redirect to admin login
- Admin login page: `/admin/login`
- Admin mentor review page: `/admin/mentors`

### API Endpoints (admin protected)
- GET `/admin/mentors/pending` → list of pending mentors
- POST `/admin/mentors/:id/approve`
- POST `/admin/mentors/:id/reject` (deletes the mentor user)

All above require `Authorization: Bearer <accessToken>` of an admin user and `withCredentials: true` for cookie refresh.

### UI Flow
1) Admin Login
- Use the same login endpoint: `POST /auth/login` with seeded admin credentials.
- On success, store `accessToken` and check `/auth/me` to ensure `roles` includes `admin`.

2) Pending Mentors List
- Fetch: `GET /admin/mentors/pending`.
- Show table with: name, email, createdAt, actions.
- Approve button → POST `/admin/mentors/{id}/approve`.
- Reject button → POST `/admin/mentors/{id}/reject` (deletes user).
- After action, refetch list.

### Notes
- Admin uses the same token system: access token in memory/localStorage; refresh cookie for rotation.
- If you need a separate admin-only login page, reuse the normal login API; only the UI differs.
- Rejection deletes the mentor user; adjust UI text accordingly. 