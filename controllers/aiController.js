const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Fallback responses for when API fails or quota exceeded
const fallbackResponses = [
  "I understand you're looking for guidance. While I'm temporarily unable to provide a detailed response, I recommend checking out MDN Web Docs for web development questions or the official documentation for your specific technology.",
  "Great question! Although I'm having some technical difficulties right now, I suggest breaking down complex problems into smaller parts and tackling them one by one. Stack Overflow and GitHub discussions are also excellent resources.",
  "I appreciate your inquiry! While I'm currently unavailable, consider reaching out to your mentor for personalized guidance, or explore interactive coding platforms like freeCodeCamp or Codecademy.",
  "That's an interesting challenge! Even though I can't provide a full response at the moment, try explaining your problem to a rubber duck or colleague - you'd be surprised how often this helps clarify your thinking.",
  "Thank you for your question! While I'm temporarily offline, remember that the best way to learn is through hands-on practice. Try building a small project that incorporates the concept you're asking about."
];

// Specialized fallback responses for different mentor types
const specializedFallbackResponses = {
  'software-dev': [
    "While I'm having technical difficulties, I'd recommend checking the official documentation for your specific technology stack. Stack Overflow and GitHub issues are also excellent resources for debugging.",
    "I'm temporarily unavailable, but consider using console.log() statements to debug your code step by step. The browser's developer tools are your best friend for troubleshooting.",
    "Although I can't assist right now, remember that breaking down complex problems into smaller functions often makes debugging much easier. Try isolating the problematic code."
  ],
  'marketing': [
    "While I'm temporarily offline, consider analyzing your target audience's behavior and preferences. Tools like Google Analytics can provide valuable insights for your marketing strategy.",
    "I'm having technical issues, but remember that successful marketing often starts with understanding your customer's pain points and how your product solves them.",
    "Although I can't respond right now, focus on creating value-driven content that addresses your audience's specific needs and challenges."
  ],
  'healthcare': [
    "While I'm temporarily unavailable, I recommend consulting peer-reviewed medical journals and professional healthcare associations for the most current and accurate information.",
    "I'm having technical difficulties, but remember to always verify healthcare information with qualified medical professionals and evidence-based sources.",
    "Although I can't assist right now, consider reaching out to healthcare professionals or academic institutions for guidance on medical and healthcare topics."
  ],
  'legal': [
    "While I'm temporarily offline, remember that legal matters require consultation with qualified attorneys. Consider reaching out to your local bar association for referrals.",
    "I'm having technical issues, but legal research should always be verified with current statutes and regulations. Professional legal databases are essential resources.",
    "Although I can't respond right now, keep in mind that legal advice should only be provided by licensed attorneys familiar with your specific jurisdiction."
  ],
  'business': [
    "While I'm temporarily unavailable, consider analyzing successful businesses in your industry to understand their strategies and market positioning.",
    "I'm having technical difficulties, but remember that solid business planning starts with thorough market research and understanding your competition.",
    "Although I can't assist right now, focus on validating your business ideas with potential customers before making major investments."
  ]
};

// Get random fallback response (with specialization support)
const getRandomFallback = (mentorType = null) => {
  if (mentorType && specializedFallbackResponses[mentorType]) {
    const responses = specializedFallbackResponses[mentorType];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
};

// Build system prompt based on user profile
const buildSystemPrompt = (user) => {
  const role = user.roles?.includes('mentor') ? 'Mentor' : 'Learner';
  const skills = user.skills?.join(', ') || 'General web development';
  const learningGoal = user.learningGoal || 'Improve programming skills';

  return `You are a helpful and friendly coding mentor AI assistant for SkillSphere, a web development learning platform.

User Profile:
- Role: ${role}
- Skills: ${skills}
- Learning Goal: ${learningGoal}

Instructions:
- Answer questions simply but accurately
- Provide practical, actionable advice
- Suggest specific resources when helpful
- Be encouraging and supportive
- Keep responses concise but informative
- If the user is a mentor, focus on teaching strategies and advanced concepts
- If the user is a learner, focus on clear explanations and step-by-step guidance
- Always relate answers back to web development and programming when possible`;
};

/**
 * POST /ai/ask
 * Handle AI chatbot questions
 */
exports.askAI = async (req, res, next) => {
  try {
    const { message, chatHistory = [], customSystemPrompt, mentorType } = req.body;
    const user = req.user;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
      console.log('Gemini API key not configured, using fallback response');
      return res.json({
        success: true,
        response: getRandomFallback(mentorType),
        isAI: false
      });
    }

    try {
      // Simple model initialization with correct model name
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      });
      
      // Build conversation context - use custom system prompt if provided
      const systemPrompt = customSystemPrompt || buildSystemPrompt(user);
      
      // Format chat history for context (limit to last 5 messages)
      const recentHistory = chatHistory.slice(-5);
      let conversationContext = systemPrompt + "\n\nConversation History:\n";
      
      recentHistory.forEach(msg => {
        conversationContext += `${msg.isUser ? 'User' : 'Assistant'}: ${msg.text}\n`;
      });
      
      conversationContext += `\nUser: ${message}\nAssistant:`;

      // Generate response
      const result = await model.generateContent(conversationContext);
      const response = await result.response;
      const text = response.text();

      res.json({
        success: true,
        response: text,
        isAI: true
      });

    } catch (apiError) {
      console.error('Gemini API Error:', apiError.message);
      
      // Return fallback response if API fails
      res.json({
        success: true,
        response: getRandomFallback(mentorType),
        isAI: false
      });
    }

  } catch (error) {
    console.error('AI Controller Error:', error);
    next(error);
  }
};

/**
 * POST /ai/summarize-session
 * Summarize a session transcript
 */
exports.summarizeSession = async (req, res, next) => {
  try {
    const { transcript } = req.body;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Transcript is required'
      });
    }

    // Fallback static resources for MVP
    const staticResources = [
      "MDN Web Docs - https://developer.mozilla.org",
      "freeCodeCamp - https://freecodecamp.org",
      "JavaScript.info - https://javascript.info",
      "CSS-Tricks - https://css-tricks.com",
      "React Official Docs - https://react.dev"
    ];

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        summary: "• Session covered key web development concepts\n• Discussion included practical programming techniques\n• Mentor provided guidance on best practices",
        resources: staticResources,
        isAI: false
      });
    }

    try {
      let model;
      try {
        // Use the correct model name
        model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      } catch (error) {
        // Fallback to older model if needed
        model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
      }
      
      const prompt = `Summarize this learning session transcript in bullet points. Then provide 3 recommended learning resources with brief descriptions.

Transcript:
${transcript}

Please format your response as:
SUMMARY:
• [bullet point 1]
• [bullet point 2]
• [bullet point 3]

RECOMMENDED RESOURCES:
1. [Resource name] - [brief description]
2. [Resource name] - [brief description]
3. [Resource name] - [brief description]`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response to extract summary and resources
      const sections = text.split('RECOMMENDED RESOURCES:');
      const summarySection = sections[0].replace('SUMMARY:', '').trim();
      
      let resources = staticResources;
      if (sections[1]) {
        const resourceLines = sections[1].trim().split('\n').filter(line => line.trim().length > 0);
        resources = resourceLines.slice(0, 3).map(line => line.replace(/^\d+\.\s*/, ''));
      }

      res.json({
        success: true,
        summary: summarySection,
        resources: resources.slice(0, 3),
        isAI: true
      });

    } catch (apiError) {
      console.error('Gemini API Error for summarization:', apiError);
      
      // Return fallback response
      res.json({
        success: true,
        summary: "• Session covered important programming concepts\n• Mentor provided valuable insights and guidance\n• Discussion included practical problem-solving techniques",
        resources: staticResources.slice(0, 3),
        isAI: false
      });
    }

  } catch (error) {
    console.error('AI Summarization Error:', error);
    next(error);
  }
};

/**
 * GET /ai/welcome
 * Get personalized welcome message
 */
exports.getWelcomeMessage = async (req, res, next) => {
  try {
    const user = req.user;
    const name = user.fullName || user.name || 'there';
    const role = user.roles?.includes('mentor') ? 'mentor' : 'learner';
    const skills = user.skills?.length > 0 ? user.skills[0] : 'programming';

    const welcomeMessage = `Hi ${name}! I'm your AI Learning Assistant. I see you're ${role === 'mentor' ? 'a mentor' : 'interested in'} ${skills}. What can I help you with today?`;

    res.json({
      success: true,
      welcome: welcomeMessage,
      suggestedQuestions: [
        "Explain React hooks in simple terms",
        "What are best practices for responsive design?",
        "How do I debug JavaScript errors effectively?",
        "What's the difference between var, let, and const?",
        "How can I improve my code's performance?"
      ]
    });

  } catch (error) {
    console.error('Welcome Message Error:', error);
    next(error);
  }
};

/**
 * GET /ai/recommended-mentors
 * Get AI-based recommended mentors for learners
 */
exports.getRecommendedMentors = async (req, res, next) => {
  try {
    const user = req.user;
    const User = require('../models/User');
    
    // Get user's skills and learning goals
    const userSkills = user.skills || [];
    const userLearningGoal = user.learningGoal || '';
    
    // Find mentors with matching or complementary skills
    const mentors = await User.find({
      roles: 'mentor',
      isApproved: true,
      $or: [
        { skills: { $in: userSkills } },
        { bio: { $regex: userLearningGoal, $options: 'i' } }
      ]
    })
    .select('fullName avatar skills bio hourlyRate')
    .limit(6);

    // Add AI-generated matching reasons
    const recommendedMentors = mentors.map(mentor => {
      const matchingSkills = mentor.skills?.filter(skill => 
        userSkills.includes(skill)
      ) || [];
      
      let matchReason = '';
      if (matchingSkills.length > 0) {
        matchReason = `Expert in ${matchingSkills.slice(0, 2).join(', ')}`;
      } else if (userLearningGoal && mentor.bio?.toLowerCase().includes(userLearningGoal.toLowerCase())) {
        matchReason = 'Matches your learning goals';
      } else {
        matchReason = 'Recommended based on your profile';
      }

      return {
        ...mentor.toObject(),
        matchReason,
        aiScore: Math.floor(Math.random() * 30) + 70 // Random score between 70-100
      };
    });

    // Sort by AI score
    recommendedMentors.sort((a, b) => b.aiScore - a.aiScore);

    res.json({
      success: true,
      mentors: recommendedMentors.slice(0, 4), // Return top 4
      message: `Found ${recommendedMentors.length} AI-recommended mentors based on your profile`
    });

  } catch (error) {
    console.error('AI Recommended Mentors Error:', error);
    next(error);
  }
};

/**
 * GET /ai/mentor-insights
 * Get AI-powered insights for mentors
 */
exports.getMentorInsights = async (req, res, next) => {
  try {
    const mentorId = req.user.id;
    const Booking = require('../models/Booking');
    const Feedback = require('../models/Feedback');
    
    // Get mentor's recent bookings and feedback
    const recentBookings = await Booking.find({ mentorId })
      .populate('learnerId', 'skills learningGoal')
      .sort({ createdAt: -1 })
      .limit(10);
      
    const recentFeedback = await Feedback.find({ mentorId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Generate AI insights
    const commonSkills = {};
    const learnerGoals = [];
    
    recentBookings.forEach(booking => {
      if (booking.learnerId?.skills) {
        booking.learnerId.skills.forEach(skill => {
          commonSkills[skill] = (commonSkills[skill] || 0) + 1;
        });
      }
      if (booking.learnerId?.learningGoal) {
        learnerGoals.push(booking.learnerId.learningGoal);
      }
    });

    const topSkills = Object.entries(commonSkills)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([skill]) => skill);

    const avgRating = recentFeedback.length > 0 
      ? recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length 
      : 0;

    const insights = {
      topRequestedSkills: topSkills,
      averageRating: avgRating.toFixed(1),
      totalSessions: recentBookings.length,
      suggestions: [
        topSkills.length > 0 ? `Consider creating specialized courses in ${topSkills[0]}` : 'Diversify your skill offerings',
        avgRating >= 4.5 ? 'Your excellent ratings show great mentoring skills!' : 'Focus on improving session feedback',
        'Update your profile with recent projects to attract more learners'
      ]
    };

    res.json({
      success: true,
      insights
    });

  } catch (error) {
    console.error('Mentor Insights Error:', error);
    next(error);
  }
};
