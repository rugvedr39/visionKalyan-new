const { MongoClient } = require('mongodb');

const mongoURL = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = 'VisionKalyan_New';

let client;
const MAX_RETRIES = 100;
const RETRY_DELAY = 5000;

async function connectToMongoDB(retries = 0) {
  if (client) {
    return client.db(dbName);
  }

  try {
    const newClient = await MongoClient.connect(mongoURL);
    client = newClient;
    return client.db(dbName);
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.error(`Error connecting to MongoDB (Attempt ${retries + 1}/${MAX_RETRIES}):`, error);
      console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectToMongoDB(retries + 1);
    } else {
      console.error('Max retries reached. Unable to establish MongoDB connection.');
      throw error;
    }
  }
}

module.exports = {
  connectToMongoDB,
};