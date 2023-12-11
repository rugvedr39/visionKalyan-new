// app.js

const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const paymentRoutes = require('./paymentRoutes');
const usersRoutes = require('./UserRoutes');
const loginRoutes = require('./loginRoutes');
const payoutRoutes = require('./payoutRoutes');
const projects = require('./land-project');
const emi = require('./emi');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Replace '*' with your specific origin
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});


// MongoDB connection URL
const mongoURL = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'VisionKalyan_New';
const client = new MongoClient(mongoURL);


async function connectToMongoDBWithRetry() {
  const maxRetries = 100; // Adjust the number of retries as needed
  let currentRetry = 0;

  while (currentRetry < maxRetries) {
    try {
      // Connect to MongoDB
      const client = await MongoClient.connect(mongoURL);
      return client;
    } catch (error) {
      console.error(`Error connecting to MongoDB (Attempt ${currentRetry + 1}/${maxRetries}):`, error);
      currentRetry++;

      // Wait for a certain period before the next retry (e.g., 5 seconds)
      const retryDelay = 1000;
      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  console.error(`Max retries (${maxRetries}) reached. Unable to establish MongoDB connection.`);
  return null;
}

app.post('/generate-epins', async (req, res) => {
  let client // Declare the client variable outside the try block to make it accessible in the finally block
  try {
      const { userId, count } = req.body;

      // Connect to MongoDB
      client = await connectToMongoDBWithRetry();
      const db = client.db(dbName);

      // Generate unique E-pins
      const generatedPins = [];
      while (generatedPins.length < count) {
          const newPin = Math.random().toString(36).substring(2, 10).toUpperCase();
          if (generatedPins.indexOf(newPin) === -1) {
              generatedPins.push(newPin);
          }
      }

      // Update or insert E-pins without checking if the user already has an E-pin
      await db.collection('epins').updateOne(
          { userId },
          { $addToSet: { pins: { $each: generatedPins } } },
          { upsert: true } // Create a new document if it doesn't exist
      );

      res.json({ success: true, epins: generatedPins });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
      if (client) {
          // Close the MongoDB connection in the finally block
          client.close();
      }
  }
});


//
app.get('/epins/:username', async (req, res) => {
  let client; // Declare the client variable outside the try block to make it accessible in the finally block
  try {
      const username = req.params.username;
      // Connect to MongoDB
      client = await connectToMongoDBWithRetry();
      const db = client.db(dbName);

      // Find E-pins for the given username
      const result = await db.collection('epins').findOne({ userId: username });
      if (result) {
          res.json({ success: true, epins: result.pins });
      } else {
          res.status(404).json({ success: false, message: 'E-pins not found for the specified user' });
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
      if (client) {
          // Close the MongoDB connection in the finally block
          client.close();
      }
  }
});

//
app.get('/all-epins', async (req, res) => {
  let client; // Declare the client variable outside the try block to make it accessible in the finally block
  try {
      // Connect to MongoDB
      client = await connectToMongoDBWithRetry();
      const db = client.db(dbName);

      // Find all E-pins
      const results = await db.collection('epins').find().toArray();
      res.json({ success: true, allEpins: results });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
      if (client) {
          // Close the MongoDB connection in the finally block
          client.close();
      }
  }
});




  app.get('/unpaid', async (req, res) => {
    let client; // Declare the client variable outside the try block to make it accessible in the finally block
    try {
        // Connect to MongoDB
        client =await connectToMongoDBWithRetry();
        const db = client.db(dbName);

        // Find all E-pins
        const results = await db.collection('indirectIncomeCollection').updateMany({}, { $set: { status: 'unpaid' } });
        res.json({ success: true, allEpins: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    } finally {
        if (client) {
            // Close the MongoDB connection in the finally block
            client.close();
        }
    }
});


  app.get('/topusers', async (req, res) => {
    try {
      const client =await connectToMongoDBWithRetry();
      const db = client.db(dbName);
  
      const excludedUsernames = ['VK24496086', 'VK53912943'];

      const topUsers = await db.collection('users').aggregate([
        {
          $match: {
            username: { $nin: excludedUsernames },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            username: 1,
            level1Count: {
              $size: {
                $filter: {
                  input: '$downline',
                  as: 'downlineItem',
                  cond: { $eq: ['$$downlineItem.level', 1] },
                },
              },
            },
          },
        },
        { $sort: { level1Count: -1 } },
        { $limit: 5 },
      ]).toArray();
      res.json({ success: true, topUsers: topUsers });
      client.close();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      await client.close();
    }

  })

app.use('/users',usersRoutes);
app.use('/payments', paymentRoutes);
app.use('/users', loginRoutes);
app.use('/payouts', payoutRoutes);
app.use('/projects', projects);
app.use('/emi', emi);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
