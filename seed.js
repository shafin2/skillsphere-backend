const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Booking = require('./models/Booking');
const Session = require('./models/Session');
const Transcript = require('./models/Transcript');

// Import database connection
const connectToDatabase = require('./config/db');

// Sample data
const mentorData = [
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    bio: "Senior Software Engineer with 8+ years of experience in full-stack development. Passionate about mentoring and helping developers grow their skills.",
    skills: ["JavaScript", "React", "Node.js", "Python", "AWS"],
    expertise: "Full-stack Development",
    experience: "8+ years at tech companies",
    hourlyRate: 75,
    availability: "Weekdays 6-9 PM, Weekends 10 AM-6 PM"
  },
  {
    name: "Michael Chen",
    email: "michael.chen@example.com",
    bio: "Frontend specialist with deep expertise in modern JavaScript frameworks. Former lead developer at a major tech company.",
    skills: ["React", "Vue.js", "TypeScript", "CSS", "Webpack"],
    expertise: "Frontend Development",
    experience: "6+ years in frontend development",
    hourlyRate: 65,
    availability: "Weekdays 7-10 PM, Weekends 2-8 PM"
  },
  {
    name: "Emily Rodriguez",
    email: "emily.rodriguez@example.com",
    bio: "Backend engineer specializing in scalable systems and microservices. Experienced in multiple programming languages and cloud platforms.",
    skills: ["Java", "Spring Boot", "Kubernetes", "Docker", "PostgreSQL"],
    expertise: "Backend Development",
    experience: "7+ years building scalable systems",
    hourlyRate: 80,
    availability: "Weekdays 5-9 PM, Weekends 9 AM-5 PM"
  },
  {
    name: "David Kim",
    email: "david.kim@example.com",
    bio: "DevOps engineer with expertise in CI/CD pipelines and cloud infrastructure. Helps teams implement best practices for deployment and monitoring.",
    skills: ["Docker", "Kubernetes", "Jenkins", "Terraform", "AWS"],
    expertise: "DevOps & Cloud",
    experience: "5+ years in DevOps and infrastructure",
    hourlyRate: 70,
    availability: "Weekdays 6-9 PM, Weekends 10 AM-4 PM"
  },
  {
    name: "Lisa Thompson",
    email: "lisa.thompson@example.com",
    bio: "Mobile app developer with experience in both iOS and Android development. Passionate about creating user-friendly mobile experiences.",
    skills: ["React Native", "Swift", "Kotlin", "Firebase", "Mobile UI/UX"],
    expertise: "Mobile Development",
    experience: "6+ years in mobile development",
    hourlyRate: 60,
    availability: "Weekdays 7-10 PM, Weekends 11 AM-7 PM"
  },
  {
    name: "James Wilson",
    email: "james.wilson@example.com",
    bio: "Data scientist and machine learning engineer. Helps developers understand data analysis and implement ML solutions.",
    skills: ["Python", "TensorFlow", "Pandas", "SQL", "Machine Learning"],
    expertise: "Data Science & ML",
    experience: "4+ years in data science",
    hourlyRate: 85,
    availability: "Weekdays 6-9 PM, Weekends 9 AM-6 PM"
  },
  {
    name: "Rachel Green",
    email: "rachel.green@example.com",
    bio: "UX/UI designer turned developer. Brings unique perspective on user experience and frontend development.",
    skills: ["Figma", "React", "CSS", "User Research", "Prototyping"],
    expertise: "UX/UI & Frontend",
    experience: "5+ years in design and development",
    hourlyRate: 55,
    availability: "Weekdays 5-8 PM, Weekends 12-6 PM"
  },
  {
    name: "Alex Turner",
    email: "alex.turner@example.com",
    bio: "Full-stack developer with focus on performance optimization and clean code. Experienced in mentoring junior developers.",
    skills: ["JavaScript", "React", "Node.js", "Performance", "Code Review"],
    expertise: "Full-stack Development",
    experience: "9+ years in software development",
    hourlyRate: 75,
    availability: "Weekdays 6-9 PM, Weekends 10 AM-5 PM"
  },
  {
    name: "Maria Garcia",
    email: "maria.garcia@example.com",
    bio: "Security engineer with expertise in application security and secure coding practices. Helps developers build secure applications.",
    skills: ["Security", "OWASP", "Penetration Testing", "Secure Coding", "Cryptography"],
    expertise: "Application Security",
    experience: "6+ years in cybersecurity",
    hourlyRate: 90,
    availability: "Weekdays 7-10 PM, Weekends 2-8 PM"
  },
  {
    name: "Tom Anderson",
    email: "tom.anderson@example.com",
    bio: "Senior architect with experience in designing large-scale systems. Specializes in system design and technical architecture.",
    skills: ["System Design", "Architecture", "Scalability", "Microservices", "Design Patterns"],
    expertise: "System Architecture",
    experience: "12+ years in software architecture",
    hourlyRate: 100,
    availability: "Weekdays 6-9 PM, Weekends 9 AM-5 PM"
  }
];

// Sample ratings for mentors
const generateRatings = () => {
  const ratings = [];
  const numRatings = Math.floor(Math.random() * 5) + 8; // 8-12 ratings for good data
  
  const reviews = [
    "Excellent mentor! Very knowledgeable and patient. Helped me understand complex React concepts.",
    "Great teaching style and practical examples. Would definitely book again!",
    "Helped me understand complex concepts easily. Very professional approach.",
    "Professional and well-prepared for our sessions. Provided great resources.",
    "Highly recommend this mentor for beginners. Very encouraging and supportive.",
    "Clear explanations and good communication skills. Made learning enjoyable.",
    "Very helpful with real-world examples. Showed me industry best practices.",
    "Patient and encouraging throughout the session. Great at breaking down problems.",
    "Outstanding mentor! Helped me land my first developer job.",
    "Fantastic session! Got immediate value and actionable insights.",
    "Super knowledgeable and explains things in simple terms.",
    "Amazing mentor who really cares about student success.",
    "Best investment I've made in my learning journey!",
    "Incredible expertise and teaching ability. Highly recommended!",
    "Really helped me level up my coding skills quickly."
  ];
  
  for (let i = 0; i < numRatings; i++) {
    // Generate ratings with proper distribution (mostly 4-5 stars)
    const ratingScore = Math.random() > 0.2 ? 
      (Math.random() > 0.3 ? 5 : 4) : // 70% get 5 stars, 20% get 4 stars
      (Math.random() > 0.5 ? 3 : 2);   // 8% get 3 stars, 2% get 2 stars
      
    ratings.push({
      rating: ratingScore,
      comment: reviews[Math.floor(Math.random() * reviews.length)],
      date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) // Random date within last year
    });
  }
  
  return ratings;
};

// Sample transcript text
const generateTranscriptText = () => {
  const conversations = [
    [
      { speaker: "learner", text: "Hi Sarah, thanks for taking the time to meet with me today. I've been working on a React project and I'm having trouble with state management." },
      { speaker: "mentor", text: "Hello Alex! I'm happy to help. State management can be tricky when you're starting out. What specific issues are you running into?" },
      { speaker: "learner", text: "Well, I have multiple components that need to share data, and I'm not sure whether to use props, context, or Redux. It's getting confusing." },
      { speaker: "mentor", text: "That's a very common challenge! Let's break this down. For your use case, I'd recommend starting with React Context. It's built into React and perfect for sharing data across components." },
      { speaker: "learner", text: "That sounds good. Can you show me how to set up a context provider?" },
      { speaker: "mentor", text: "Absolutely! Let's create a simple example. First, you'll need to create a context using createContext, then wrap your app with a provider." }
    ],
    [
      { speaker: "learner", text: "Hi Michael, I'm working on a React component and I'm having issues with re-rendering. The component keeps updating when I don't expect it to." },
      { speaker: "mentor", text: "Hey Alex! Re-rendering issues are very common in React. Let's look at your component structure and see what might be causing unnecessary updates." },
      { speaker: "learner", text: "I'm using useState and useEffect, but it seems like the component re-renders even when the state hasn't changed." },
      { speaker: "mentor", text: "That's a classic issue! The problem is likely that you're creating new objects or arrays on every render. Let's use React.memo and useCallback to optimize this." },
      { speaker: "learner", text: "I've heard of those but I'm not sure how to use them properly. Can you explain?" },
      { speaker: "mentor", text: "Of course! React.memo is a higher-order component that prevents re-renders if props haven't changed. useCallback memoizes functions to prevent unnecessary re-renders." }
    ],
    [
      { speaker: "learner", text: "Hi Emily, I'm trying to set up a Node.js backend for my React app, but I'm having trouble with the database connection." },
      { speaker: "mentor", text: "Hello Alex! Database connections can be tricky. What database are you using and what specific error are you getting?" },
      { speaker: "learner", text: "I'm using MongoDB with Mongoose, and I keep getting connection timeout errors." },
      { speaker: "mentor", text: "That's usually a configuration issue. Let's check your connection string and make sure you're handling the connection properly with error handling." },
      { speaker: "learner", text: "I'm using the basic connection string from MongoDB Atlas. Should I be adding any options?" },
      { speaker: "mentor", text: "Yes! You should definitely add connection options. Let's set up proper error handling, connection pooling, and timeout settings to make it more robust." }
    ]
  ];
  
  return conversations[Math.floor(Math.random() * conversations.length)];
};

// Sample mentor notes
const generateMentorNotes = () => {
  const notes = [
    "Alex shows good understanding of basic concepts. Recommended focusing on practical projects to reinforce learning.",
    "Great session! Alex is making good progress. Suggested working on a small project to apply the concepts we discussed.",
    "Alex has strong fundamentals. Recommended exploring more advanced topics in the next session.",
    "Excellent questions from Alex. Provided additional resources for deeper learning on the topics covered.",
    "Good session overall. Alex should practice the examples we discussed to solidify understanding.",
    "Alex is very engaged and asks thoughtful questions. Recommended continuing with hands-on practice."
  ];
  
  return notes[Math.floor(Math.random() * notes.length)];
};

async function seedDatabase() {
  try {
    // Connect to database
    await connectToDatabase();
    console.log('Connected to database');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Booking.deleteMany({});
    await Session.deleteMany({});
    await Transcript.deleteMany({});
    console.log('Existing data cleared');

    // Hash password
    const hashedPassword = await bcrypt.hash("123456@A", 10);

    // Create learner
    console.log('Creating learner...');
    const learner = new User({
      name: "Alex Carter",
      email: "alex.carter@example.com",
      password: hashedPassword,
      roles: ['learner'],
      fullName: "Alex Carter",
      bio: "Aspiring full-stack software engineer passionate about scalable web apps.",
      skills: ["JavaScript", "React", "Node.js", "MongoDB"],
      experience: "1 year internship at a startup.",
      isProfileComplete: true,
      isEmailVerified: true
    });
    await learner.save();
    console.log('Learner created:', learner.email);

    // Create mentors
    console.log('Creating mentors...');
    const mentors = [];
    for (let index = 0; index < mentorData.length; index++) {
      const mentorInfo = mentorData[index];
      
      // First 7 mentors are approved, last 3 need approval
      const isApproved = index < 7;
      
      const mentor = new User({
        name: mentorInfo.name,
        email: mentorInfo.email,
        password: hashedPassword,
        roles: ['mentor'],
        fullName: mentorInfo.name,
        bio: mentorInfo.bio,
        skills: mentorInfo.skills,
        expertise: mentorInfo.expertise,
        experience: mentorInfo.experience,
        hourlyRate: mentorInfo.hourlyRate,
        availability: mentorInfo.availability,
        isApproved: isApproved,
        isProfileComplete: true,
        isEmailVerified: true,
        ratings: isApproved ? generateRatings() : [] // Only approved mentors have ratings
      });
      await mentor.save();
      mentors.push(mentor);
      console.log('Mentor created:', mentor.email, `(${isApproved ? 'Approved' : 'Pending Approval'})`);
    }

    // Create bookings and sessions for first 3 approved mentors
    console.log('Creating bookings and sessions...');
    const approvedMentors = mentors.filter(mentor => mentor.isApproved);
    const sessionMentors = approvedMentors.slice(0, 3);
    
    for (let i = 0; i < 3; i++) {
      const mentor = sessionMentors[i];
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - (i + 1) * 7); // Past sessions, 1 week apart
      
      // Create booking
      const booking = new Booking({
        mentorId: mentor._id,
        learnerId: learner._id,
        date: sessionDate,
        time: "14:00",
        message: `Session with ${mentor.name} to discuss ${mentor.skills[0]} development`,
        status: 'completed'
      });
      await booking.save();

      // Create session
      const session = new Session({
        bookingId: booking._id,
        mentorId: mentor._id,
        learnerId: learner._id,
        chatRoomId: `chat_${booking._id}`,
        videoRoomId: `video_${booking._id}`,
        status: 'completed',
        startedAt: sessionDate,
        endedAt: new Date(sessionDate.getTime() + 60 * 60 * 1000), // 1 hour later
        duration: 60,
        notes: generateMentorNotes()
      });
      await session.save();

      // Create transcript
      const transcriptText = generateTranscriptText();
      const transcript = new Transcript({
        bookingId: booking._id,
        sessionId: session._id.toString(),
        participants: {
          learner: {
            userId: learner._id,
            name: learner.name
          },
          mentor: {
            userId: mentor._id,
            name: mentor.name
          }
        },
        transcript: {
          segments: transcriptText.map((entry, index) => ({
            speaker: entry.speaker,
            text: entry.text,
            startTime: index * 60000, // 1 minute intervals
            endTime: (index + 1) * 60000,
            confidence: 0.95
          })),
          fullText: transcriptText.map(entry => `[${entry.speaker}]: ${entry.text}`).join('\n'),
          duration: transcriptText.length * 60 // 1 minute per segment
        },
        metadata: {
          sessionStartTime: sessionDate,
          sessionEndTime: new Date(sessionDate.getTime() + 60 * 60 * 1000),
          actualDuration: transcriptText.length * 60,
          recordingQuality: 'good'
        },
        summary: {
          keyPoints: [
            `Discussed ${mentor.skills[0]} development with ${mentor.name}`,
            "Explored different approaches to problem solving",
            "Covered best practices and industry standards",
            "Reviewed code examples and implementation strategies"
          ],
          actionItems: [
            `Practice implementing ${mentor.skills[0]} concepts`,
            "Build a small project using the concepts discussed",
            "Review the provided code examples",
            "Schedule follow-up session for advanced topics"
          ],
          topics: mentor.skills.slice(0, 3),
          sentiment: "positive"
        }
      });
      await transcript.save();

      console.log(`Session ${i + 1} created with ${mentor.name} (ID: ${session._id})`);
    }

    console.log('Seed data inserted successfully!');
    console.log(`Created: 1 learner, ${mentors.length} mentors (${approvedMentors.length} approved, ${mentors.length - approvedMentors.length} pending), 3 sessions with transcripts`);
    
    // Disconnect from database
    await mongoose.disconnect();
    console.log('Disconnected from database');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase(); 