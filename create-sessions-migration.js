// Create sessions for existing confirmed bookings
const mongoose = require('mongoose');
require('dotenv').config();

const Booking = require('./models/Booking');
const Session = require('./models/Session');
const User = require('./models/User');
const client = require('./config/stream');
const { v4: uuidv4 } = require('uuid');

async function createSessionsForExistingBookings() {
  try {
    await mongoose.connect(process.env.DB_URL || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all confirmed bookings without sessions
    const confirmedBookings = await Booking.find({ status: 'confirmed' })
      .populate('mentorId learnerId');

    console.log(`📋 Found ${confirmedBookings.length} confirmed bookings`);

    for (const booking of confirmedBookings) {
      try {
        // Check if session already exists
        const existingSession = await Session.findOne({ bookingId: booking._id });
        
        if (existingSession) {
          console.log(`⏭️  Session already exists for booking ${booking._id}`);
          continue;
        }

        console.log(`🔄 Creating session for booking ${booking._id}...`);

        const mentorIdStr = booking.mentorId._id.toString();
        const learnerIdStr = booking.learnerId._id.toString();

        // Create chat room ID
        const chatRoomId = `booking_${booking._id}`;

        // Create video room ID
        const videoRoomId = `session_${booking._id}_${Date.now()}`;

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
          created_by_id: mentorIdStr,
          name: `Session: ${booking.mentorId.fullName || booking.mentorId.name} & ${booking.learnerId.fullName || booking.learnerId.name}`,
          session_date: booking.date,
          session_time: booking.time,
          booking_id: booking._id
        });

        await channel.create();

        // Create session record
        const session = await Session.create({
          bookingId: booking._id,
          mentorId: booking.mentorId._id,
          learnerId: booking.learnerId._id,
          chatRoomId,
          videoRoomId,
          status: 'upcoming'
        });

        console.log(`✅ Session created for booking ${booking._id}: ${session._id}`);

      } catch (error) {
        console.error(`❌ Error creating session for booking ${booking._id}:`, error.message);
      }
    }

    // Summary
    const totalSessions = await Session.countDocuments();
    console.log(`🎉 Process complete. Total sessions in database: ${totalSessions}`);

  } catch (error) {
    console.error('❌ Process failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  createSessionsForExistingBookings()
    .then(() => {
      console.log('Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createSessionsForExistingBookings };
