const axios = require('axios');
const Transcript = require('../models/Transcript');

class TranscriptService {
  constructor() {
    this.apiKey = process.env.ASSEMBLYAI_API_KEY;
    this.baseURL = 'https://api.assemblyai.com/v2';
    
    if (!this.apiKey) {
      console.warn('AssemblyAI API key not configured');
    }
  }

  // Upload audio file to AssemblyAI
  async uploadAudio(audioBuffer, filename) {
    try {
      const response = await axios.post(`${this.baseURL}/upload`, audioBuffer, {
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/octet-stream'
        }
      });
      
      return response.data.upload_url;
    } catch (error) {
      console.error('Error uploading audio to AssemblyAI:', error);
      throw new Error('Failed to upload audio for transcription');
    }
  }

  // Start transcription with speaker diarization
  async startTranscription(audioUrl, webhookUrl = null) {
    try {
      const transcriptRequest = {
        audio_url: audioUrl,
        speaker_labels: true, // Enable speaker diarization
        speakers_expected: 2, // Expecting learner and mentor
        auto_highlights: true,
        sentiment_analysis: true,
        entity_detection: true,
        webhook_url: webhookUrl,
        webhook_auth_header_name: 'authorization',
        webhook_auth_header_value: `Bearer ${process.env.ACCESS_TOKEN_SECRET}`
      };

      const response = await axios.post(`${this.baseURL}/transcript`, transcriptRequest, {
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error starting transcription:', error);
      throw new Error('Failed to start transcription');
    }
  }

  // Get transcription result
  async getTranscription(transcriptId) {
    try {
      const response = await axios.get(`${this.baseURL}/transcript/${transcriptId}`, {
        headers: {
          'authorization': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting transcription:', error);
      throw new Error('Failed to get transcription');
    }
  }

  // Process completed transcription and save to database
  async processCompletedTranscription(transcriptId) {
    try {
      const result = await this.getTranscription(transcriptId);
      
      if (result.status !== 'completed') {
        throw new Error(`Transcription not completed. Status: ${result.status}`);
      }

      // Find the transcript record
      const transcript = await Transcript.findOne({
        'assemblyAI.transcriptId': transcriptId
      }).populate('bookingId participants.learner.userId participants.mentor.userId');

      if (!transcript) {
        throw new Error('Transcript record not found');
      }

      // Process utterances (speaker-separated segments)
      const segments = [];
      if (result.utterances) {
        result.utterances.forEach(utterance => {
          segments.push({
            speaker: this.mapSpeaker(utterance.speaker, transcript),
            text: utterance.text,
            startTime: utterance.start,
            endTime: utterance.end,
            confidence: utterance.confidence
          });
        });
      }

      // Generate summary using highlights and sentiment
      const summary = this.generateSummary(result);

      // Update transcript record
      transcript.transcript = {
        segments,
        fullText: result.text,
        duration: Math.round(result.audio_duration / 1000) // Convert to seconds
      };
      
      transcript.assemblyAI.status = 'completed';
      transcript.summary = summary;
      transcript.metadata.sessionEndTime = new Date();
      transcript.metadata.actualDuration = Math.round(result.audio_duration / 1000);

      await transcript.save();
      
      console.log(`Transcription completed for booking ${transcript.bookingId}`);
      return transcript;

    } catch (error) {
      console.error('Error processing completed transcription:', error);
      
      // Update status to error
      await Transcript.updateOne(
        { 'assemblyAI.transcriptId': transcriptId },
        { 'assemblyAI.status': 'error' }
      );
      
      throw error;
    }
  }

  // Map speaker labels to learner/mentor
  mapSpeaker(speakerLabel, transcript) {
    // Simple mapping - in production, you might want more sophisticated logic
    // For now, assume Speaker A is the first speaker (could be either learner or mentor)
    if (speakerLabel === 'A') {
      return 'learner';
    } else if (speakerLabel === 'B') {
      return 'mentor';
    }
    return 'unknown';
  }

  // Generate summary from AssemblyAI results
  generateSummary(result) {
    const summary = {
      keyPoints: [],
      actionItems: [],
      topics: [],
      sentiment: 'neutral'
    };

    // Extract key points from highlights
    if (result.auto_highlights && result.auto_highlights.results) {
      summary.keyPoints = result.auto_highlights.results
        .slice(0, 5) // Top 5 highlights
        .map(highlight => highlight.text);
    }

    // Extract topics from entities
    if (result.entities) {
      summary.topics = [...new Set(result.entities.map(entity => entity.text))]
        .slice(0, 10); // Top 10 unique topics
    }

    // Overall sentiment
    if (result.sentiment_analysis_results) {
      const sentiments = result.sentiment_analysis_results.map(s => s.sentiment);
      const positive = sentiments.filter(s => s === 'POSITIVE').length;
      const negative = sentiments.filter(s => s === 'NEGATIVE').length;
      
      if (positive > negative) {
        summary.sentiment = 'positive';
      } else if (negative > positive) {
        summary.sentiment = 'negative';
      }
    }

    return summary;
  }

  // Create transcript record for a call session
  async createTranscriptRecord(bookingId, sessionId, learnerInfo, mentorInfo) {
    try {
      console.log('Creating transcript record for booking:', bookingId);
      console.log('Session ID:', sessionId);
      console.log('Learner info:', learnerInfo);
      console.log('Mentor info:', mentorInfo);

      const transcript = new Transcript({
        bookingId,
        sessionId,
        participants: {
          learner: {
            userId: learnerInfo.id,
            name: learnerInfo.name
          },
          mentor: {
            userId: mentorInfo.id,
            name: mentorInfo.name
          }
        },
        transcript: {
          segments: [],
          fullText: '',
          duration: 0
        },
        metadata: {
          sessionStartTime: new Date()
        }
      });

      const savedTranscript = await transcript.save();
      console.log(`Created transcript record for session ${sessionId}, ID: ${savedTranscript._id}`);
      return savedTranscript;

    } catch (error) {
      console.error('Error creating transcript record:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }
}

module.exports = new TranscriptService();
