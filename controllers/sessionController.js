const Session = require('../models/Session');
const Booking = require('../models/Booking');
const client = require('../config/stream');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a session when booking is confirmed
 * This should be called automatically when mentor accepts booking
 */
exports.createSession = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId).populate('mentorId learnerId');
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== 'confirmed') {
      throw new Error('Booking must be confirmed to create session');
    }

    // Check if session already exists
    const existingSession = await Session.findOne({ bookingId });
    if (existingSession) {
      return existingSession;
    }

    const mentorIdStr = booking.mentorId._id.toString();
    const learnerIdStr = booking.learnerId._id.toString();

    // Create chat room ID
    const chatRoomId = `booking_${bookingId}`;

    // Create video room ID (Agora channel name)
    const videoRoomId = `session_${bookingId}_${Date.now()}`;

    // Ensure users exist in Stream Chat
    await client.upsertUsers([
      {
        id: mentorIdStr,
        name: booking.mentorId.fullName || booking.mentorId.name,
        user_type: 'mentor',
        avatar: booking.mentorId.avatar
      },
      {
        id: learnerIdStr,
        name: booking.learnerId.fullName || booking.learnerId.name,
        user_type: 'learner',
        avatar: booking.learnerId.avatar
      }
    ]);

    // Create chat channel
    const channel = client.channel('messaging', chatRoomId, {
      members: [mentorIdStr, learnerIdStr],
      created_by_id: mentorIdStr, // Mentor creates the channel
      name: `Session: ${booking.mentorId.fullName} & ${booking.learnerId.fullName}`,
      session_date: booking.date,
      session_time: booking.time,
      booking_id: bookingId
    });

    await channel.create();

    // Create session record
    const session = await Session.create({
      bookingId,
      mentorId: booking.mentorId._id,
      learnerId: booking.learnerId._id,
      chatRoomId,
      videoRoomId,
      status: 'upcoming'
    });

    return session;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

/**
 * GET /sessions/:bookingId
 * Get session details for a booking
 */
exports.getSession = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check if user is part of this booking
    if (![booking.mentorId.toString(), booking.learnerId.toString()].includes(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const session = await Session.findOne({ bookingId })
      .populate('mentorId', 'fullName avatar')
      .populate('learnerId', 'fullName avatar')
      .populate('bookingId');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /sessions/my-conversations
 * Get all chat conversations for the logged-in user
 */
exports.getMyConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all sessions where user is either mentor or learner
    const sessions = await Session.find({
      $or: [
        { mentorId: userId },
        { learnerId: userId }
      ]
    })
    .populate('mentorId', 'fullName avatar')
    .populate('learnerId', 'fullName avatar')
    .populate({
      path: 'bookingId',
      select: 'date time status message'
    })
    .sort({ createdAt: -1 });

    // Format conversations for UI
    const conversations = sessions.map(session => {
      const isUserMentor = session.mentorId._id.toString() === userId;
      const otherUser = isUserMentor ? session.learnerId : session.mentorId;
      
      return {
        sessionId: session._id,
        bookingId: session.bookingId._id,
        chatRoomId: session.chatRoomId,
        otherUser: {
          id: otherUser._id,
          name: otherUser.fullName,
          avatar: otherUser.avatar,
          role: isUserMentor ? 'learner' : 'mentor'
        },
        booking: {
          date: session.bookingId.date,
          time: session.bookingId.time,
          status: session.bookingId.status,
          message: session.bookingId.message
        },
        sessionStatus: session.status,
        lastActivity: session.updatedAt,
        unreadCount: 0 // TODO: Implement unread count from Stream
      };
    });

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /sessions/:sessionId/join
 * Mark user as joined to session (for video call)
 */
exports.joinSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.roles?.includes('mentor') ? 'mentor' : 'learner';

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Check if user is part of this session
    if (![session.mentorId.toString(), session.learnerId.toString()].includes(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Update joined timestamp
    const updateData = {};
    updateData[`joinedAt.${userRole}`] = new Date();

    // If this is the first person to join, mark session as in progress
    if (!session.joinedAt?.mentor && !session.joinedAt?.learner) {
      updateData.status = 'in_progress';
      updateData.startedAt = new Date();
    }

    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      { $set: updateData },
      { new: true }
    );

    res.json({
      success: true,
      session: updatedSession,
      videoRoomId: session.videoRoomId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /sessions/:sessionId/leave
 * Mark user as left session and optionally end session
 */
exports.leaveSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Check if user is part of this session
    if (![session.mentorId.toString(), session.learnerId.toString()].includes(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Mark session as completed and calculate duration
    const endedAt = new Date();
    const duration = session.startedAt 
      ? Math.round((endedAt - session.startedAt) / (1000 * 60)) // minutes
      : 0;

    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      {
        $set: {
          status: 'completed',
          endedAt,
          duration
        }
      },
      { new: true }
    );

    // Also update the booking status to completed
    await Booking.findByIdAndUpdate(session.bookingId, {
      $set: { status: 'completed' }
    });

    res.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /sessions/:sessionId/transcript
 * Save transcript for session
 */
exports.saveTranscript = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { transcriptData, transcriptId } = req.body;
    const userId = req.user.id;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Check if user is part of this session
    if (![session.mentorId.toString(), session.learnerId.toString()].includes(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Update session with transcript ID
    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      { $set: { transcriptId } },
      { new: true }
    );

    res.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /sessions/:sessionId/transcript
 * Get transcript for session
 */
exports.getTranscript = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Check if user is part of this session
    if (![session.mentorId.toString(), session.learnerId.toString()].includes(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Find transcript by sessionId
    const Transcript = require('../models/Transcript');
    const transcript = await Transcript.findOne({ sessionId: sessionId });

    if (!transcript) {
      return res.status(404).json({ success: false, message: 'Transcript not found for this session' });
    }

    res.json({
      success: true,
      transcript: transcript
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /sessions/:sessionId/notes
 * Update session notes
 */
exports.updateNotes = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Check if user is part of this session
    if (![session.mentorId.toString(), session.learnerId.toString()].includes(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Update session notes
    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      { $set: { notes } },
      { new: true }
    );

    res.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    next(error);
  }
};
