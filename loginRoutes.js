const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

// MongoDB connection URL
const mongoURL = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'VisionKalyan_New';

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    // Establish a connection to MongoDB
    const client = await connectToMongoDBWithRetry();;
  
    try {
      await client.connect();
      const db = client.db(dbName);
  
      // Find the user in the database
      const user = await db.collection('users').findOne({ username:username });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid username' });
      }
  
      // Compare the provided password with the password stored in the database
      if (password === user.password) {

        const downlineWithNames = await Promise.all(user.downline.map(async (downlineItem) => {
          const { userId, ...rest } = downlineItem;
          const downlineUser = await db.collection('users').findOne({ _id: new Object(userId) });
          console.log(downlineUser);
          const name = downlineUser ? downlineUser.name : 'Unknown'; // Default to 'Unknown' if user not found
          return { ...rest, name };
        }));
        user.downline = downlineWithNames;
        res.json({ success: true, data:user });
      } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
      }
    } catch (error) {
      // console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    } finally {
      // Close the MongoDB connection
      await client.close();
    }
  });
  


  async function connectToMongoDBWithRetry() {
    const maxRetries = 100; // Adjust the number of retries as needed
    let currentRetry = 0;
  
    while (currentRetry < maxRetries) {
      try {
        // Connect to MongoDB
        const client = await MongoClient.connect(mongoURL);
        return client;
      } catch (error) {
        // console.error(`Error connecting to MongoDB (Attempt ${currentRetry + 1}/${maxRetries}):`, error);
        currentRetry++;
  
        // Wait for a certain period before the next retry (e.g., 5 seconds)
        const retryDelay = 1000;
        // console.log(`Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  
    // console.error(`Max retries (${maxRetries}) reached. Unable to establish MongoDB connection.`);
    return null;
  }

module.exports = router;
// 91173d34 (hjged)
