const Session = require('../models/Session');

// Start transcript recording
exports.startTranscript = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Initialize transcript
    const transcript = {
      sessionId,
      startTime: new Date(),
      entries: [],
      isRecording: true
    };

    session.transcript = transcript;
    await session.save();

    res.json({ 
      success: true, 
      message: 'Transcript recording started',
      transcriptId: session._id 
    });
  } catch (error) {
    console.error('Error starting transcript:', error);
    res.status(500).json({ error: 'Failed to start transcript' });
  }
};

// Add entry to transcript
exports.addTranscriptEntry = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { speakerName, text, timestamp } = req.body;

    const session = await Session.findById(sessionId);
    
    if (!session || !session.transcript) {
      return res.status(404).json({ error: 'Session or transcript not found' });
    }

    const entry = {
      timestamp: timestamp || new Date(),
      speakerName,
      text
    };

    session.transcript.entries.push(entry);
    await session.save();

    res.json({ 
      success: true, 
      entry 
    });
  } catch (error) {
    console.error('Error adding transcript entry:', error);
    res.status(500).json({ error: 'Failed to add transcript entry' });
  }
};

// Stop transcript recording
exports.stopTranscript = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    
    if (!session || !session.transcript) {
      return res.status(404).json({ error: 'Session or transcript not found' });
    }

    session.transcript.endTime = new Date();
    session.transcript.isRecording = false;
    await session.save();

    res.json({ 
      success: true, 
      message: 'Transcript recording stopped',
      transcript: session.transcript 
    });
  } catch (error) {
    console.error('Error stopping transcript:', error);
    res.status(500).json({ error: 'Failed to stop transcript' });
  }
};

// Get transcript
exports.getTranscript = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ 
      success: true, 
      transcript: session.transcript || null 
    });
  } catch (error) {
    console.error('Error getting transcript:', error);
    res.status(500).json({ error: 'Failed to get transcript' });
  }
};
