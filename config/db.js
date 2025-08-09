const mongoose = require('mongoose');

async function connectToDatabase() {
  const databaseUrl = process.env.DB_URL;
  if (!databaseUrl) {
    throw new Error('DB_URL is not set in environment variables');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(databaseUrl, {
    autoIndex: true,
    maxPoolSize: 10
  });

  console.log('Connected to MongoDB Atlas');
}

module.exports = connectToDatabase; 