require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function run() {
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    console.error('DB_URL env var is required');
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUrl, { autoIndex: true });

    const baseMentors = [
      {
        name: 'Aisha Khan',
        fullName: 'Aisha Khan',
        email: 'aisha.khan@example.com',
        roles: ['mentor'],
        isApproved: true,
        isEmailVerified: true,
        isProfileComplete: true,
        bio: 'Full-stack engineer specializing in React and Node.js with 6+ years of experience.',
        avatar: 'https://i.pravatar.cc/150?img=1',
        skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
        timezone: 'UTC+05:00',
        socialLinks: { linkedin: 'https://linkedin.com/in/aishak', github: 'https://github.com/aishak' },
        expertise: 'Web Development',
        availability: 'Weekdays 6-9 PM PKT, Weekends flexible',
        hourlyRate: 40,
        experience: '6+ years in full-stack development'
      },
      {
        name: 'Bilal Ahmed',
        fullName: 'Bilal Ahmed',
        email: 'bilal.ahmed@example.com',
        roles: ['mentor'],
        isApproved: true,
        isEmailVerified: true,
        isProfileComplete: true,
        bio: 'Data scientist with focus on ML pipelines and production deployment.',
        avatar: 'https://i.pravatar.cc/150?img=2',
        skills: ['Python', 'Machine Learning', 'Data Science'],
        timezone: 'UTC+05:00',
        socialLinks: { linkedin: 'https://linkedin.com/in/bilal', github: 'https://github.com/bilal' },
        expertise: 'Machine Learning',
        availability: 'Weeknights 7-10 PM PKT',
        hourlyRate: 50,
        experience: '5 years building ML systems'
      },
      {
        name: 'Sara Malik',
        fullName: 'Sara Malik',
        email: 'sara.malik@example.com',
        roles: ['mentor'],
        isApproved: true,
        isEmailVerified: true,
        isProfileComplete: true,
        bio: 'Frontend specialist with React and TypeScript. Passionate about UI/UX.',
        avatar: 'https://i.pravatar.cc/150?img=3',
        skills: ['React', 'TypeScript', 'UI/UX'],
        timezone: 'UTC+04:00',
        socialLinks: { linkedin: 'https://linkedin.com/in/saram', github: 'https://github.com/saram' },
        expertise: 'Frontend Engineering',
        availability: 'Weekends 2-6 PM GST',
        hourlyRate: 45,
        experience: '4+ years frontend'
      },
      {
        name: 'Imran Qureshi',
        fullName: 'Imran Qureshi',
        email: 'imran.qureshi@example.com',
        roles: ['mentor'],
        isApproved: true,
        isEmailVerified: true,
        isProfileComplete: true,
        bio: 'DevOps engineer with Docker and AWS expertise.',
        avatar: 'https://i.pravatar.cc/150?img=4',
        skills: ['Docker', 'AWS', 'CI/CD'],
        timezone: 'UTC+01:00',
        socialLinks: { linkedin: 'https://linkedin.com/in/imranq' },
        expertise: 'DevOps',
        availability: 'Weekdays 5-8 PM CET',
        hourlyRate: 60,
        experience: '7 years in DevOps'
      },
      {
        name: 'Nida Ali',
        fullName: 'Nida Ali',
        email: 'nida.ali@example.com',
        roles: ['mentor'],
        isApproved: true,
        isEmailVerified: true,
        isProfileComplete: true,
        bio: 'Mobile developer building cross-platform apps.',
        avatar: 'https://i.pravatar.cc/150?img=5',
        skills: ['React Native', 'JavaScript', 'UI/UX'],
        timezone: 'UTC+08:00',
        socialLinks: { linkedin: 'https://linkedin.com/in/nidaali' },
        expertise: 'Mobile Development',
        availability: 'Weekends only',
        hourlyRate: 35,
        experience: '3 years in mobile apps'
      },
      // Unapproved mentors (5)
      {
        name: 'Usman Tariq',
        fullName: 'Usman Tariq',
        email: 'usman.tariq@example.com',
        roles: ['mentor'],
        isApproved: false,
        isEmailVerified: true,
        isProfileComplete: true,
        bio: 'Backend engineer exploring microservices.',
        avatar: 'https://i.pravatar.cc/150?img=6',
        skills: ['Node.js', 'MongoDB', 'Express'],
        timezone: 'UTC+05:00',
        expertise: 'Backend Development',
        availability: 'Weeknights 8-10 PM PKT',
        hourlyRate: 30,
        experience: '2+ years backend'
      },
      {
        name: 'Hina Raza',
        fullName: 'Hina Raza',
        email: 'hina.raza@example.com',
        roles: ['mentor'],
        isApproved: false,
        isEmailVerified: true,
        isProfileComplete: false,
        bio: 'Cloud practitioner.',
        avatar: 'https://i.pravatar.cc/150?img=7',
        skills: ['AWS', 'Terraform'],
        timezone: 'UTC+03:00',
        expertise: 'Cloud',
        availability: 'Weekends',
        hourlyRate: 55,
        experience: '3 years cloud'
      },
      {
        name: 'Zara Hussain',
        fullName: 'Zara Hussain',
        email: 'zara.hussain@example.com',
        roles: ['mentor'],
        isApproved: false,
        isEmailVerified: true,
        isProfileComplete: true,
        bio: 'UI/UX designer transitioning to frontend.',
        avatar: 'https://i.pravatar.cc/150?img=8',
        skills: ['UI/UX', 'Figma', 'React'],
        timezone: 'UTC+00:00',
        expertise: 'Design Systems',
        availability: 'Evenings GMT',
        hourlyRate: 28,
        experience: '2 years design'
      },
      {
        name: 'Ali Raza',
        fullName: 'Ali Raza',
        email: 'ali.raza@example.com',
        roles: ['mentor'],
        isApproved: false,
        isEmailVerified: true,
        isProfileComplete: true,
        bio: 'SRE enthusiast.',
        avatar: 'https://i.pravatar.cc/150?img=9',
        skills: ['Kubernetes', 'Prometheus', 'Grafana'],
        timezone: 'UTC+02:00',
        expertise: 'SRE',
        availability: 'CET evenings',
        hourlyRate: 65,
        experience: '5 years SRE'
      },
      {
        name: 'Mehak Noor',
        fullName: 'Mehak Noor',
        email: 'mehak.noor@example.com',
        roles: ['mentor'],
        isApproved: false,
        isEmailVerified: true,
        isProfileComplete: true,
        bio: 'Data analyst learning ML.',
        avatar: 'https://i.pravatar.cc/150?img=10',
        skills: ['SQL', 'Python', 'Pandas'],
        timezone: 'UTC+05:00',
        expertise: 'Data Analysis',
        availability: 'Weekends only',
        hourlyRate: 20,
        experience: '2 years analytics'
      }
    ];

    // Upsert mentors by email to avoid duplicates
    for (const mentor of baseMentors) {
      await User.findOneAndUpdate(
        { email: mentor.email.toLowerCase() },
        { $set: mentor },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log('Seeded mentors: 10 (5 approved, 5 unapproved)');
  } catch (err) {
    console.error('Failed to seed mentors:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run(); 