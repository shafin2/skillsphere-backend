// Agora configuration
const AgoraRTC = require('agora-rtc-sdk-ng');

const agoraConfig = {
  appId: process.env.AGORA_APP_ID || "YOUR_AGORA_APP_ID",
  appCertificate: process.env.AGORA_APP_CERTIFICATE || "YOUR_AGORA_APP_CERTIFICATE",
  // Token server URL if using token authentication
  tokenServerUrl: process.env.AGORA_TOKEN_SERVER_URL || null
};

// Generate Agora token (simplified - in production use proper token server)
const generateAgoraToken = (channelName, uid = 0, role = 'publisher') => {
  // For development, return null to use temp token
  // In production, implement proper token generation using Agora's AccessToken
  return null;
};

module.exports = {
  agoraConfig,
  generateAgoraToken
};
