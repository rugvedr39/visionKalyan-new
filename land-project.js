const express = require('express');
const router = express.Router();
const { MongoClient,ObjectId } = require('mongodb');

// MongoDB connection URL
const mongoURL = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'VisionKalyan_New';
const collectionName = 'lands';

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
  }}

// Create
router.post('/lands', async (req, res) => {
  const client = await connectToMongoDBWithRetry();
  try {
    const db = client.db(dbName);
    
    const result = await db.collection(collectionName).insertOne(req.body);
    res.status(201).json(result);
  } catch (error) {
    // console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.close();
  }
});

// Read
router.get('/lands', async (req, res) => {
  const client = await connectToMongoDBWithRetry();
  try {
    const db = client.db(dbName);
    
    const lands = await db.collection(collectionName).find().toArray();
    res.json(lands);
  } catch (error) {
    // console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.close();
  }
});

// Update
router.put('/lands/:id', async (req, res) => {
  const client = await connectToMongoDBWithRetry();
  try {
    const db = client.db(dbName);
    
    const result = await db.collection(collectionName).updateOne(
      { _id: ObjectId(req.params.id) },
      { $set: req.body }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Land not found' });
    } else {
      res.json({ message: 'Land updated successfully' });
    }
  } catch (error) {
    // console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.close();
  }
});

// Delete
router.delete('/lands/:id', async (req, res) => {
  const client = await connectToMongoDBWithRetry();
  try {
    const db = client.db(dbName);
    
    const result = await db.collection(collectionName).deleteOne({ _id: ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Land not found' });
    } else {
      res.json({ message: 'Land deleted successfully' });
    }
  } catch (error) {
    // console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.close();
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