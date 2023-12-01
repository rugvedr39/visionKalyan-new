// paymentRoutes.js

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

// MongoDB connection URL
const mongoURL = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'VisionKalyan_New';

// Create a new payment
router.post('/add', async (req, res) => {
  try {
    const { username, date } = req.body;

    // Connect to MongoDB
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);

    // Check if the username is available
    const existingUser = await db.collection('users').findOne({ username });
    if (!existingUser) {
      client.close();
      return res.status(404).json({ success: false, message: 'Username not found' });
    }

    // Add payment to the 'payments' collection
    const result = await db.collection('payments').insertOne({ username, date });

    const now = new Date();
    const options= Intl.DateTimeFormatOptions = {
       timeZone: 'Asia/Kolkata',
       hour12: false,
     };
    let indirectIncomeCollectionName='indirectIncomeCollection';
    let UserCollectionName='users';
    let UsersCollection = db.collection(UserCollectionName);
    let indirectIncomeCollection = db.collection(indirectIncomeCollectionName);
    // making indrect payment
  let sponserID = await UsersCollection.findOne({username: req.body.username})
  let totalPayments = await indirectIncomeCollection.find({username:sponserID.sponsorId,level:1,whos:req.body.username}).toArray()
  if (sponserID.sponsorId!=''&&totalPayments.length<15&&totalPayments.length<15) {
    let levelPaymentData = {
      username: sponserID.sponsorId,
      date: now.toLocaleString('en-US', options),
      level: 1,
      amount: 500,
      whos: req.body.username,
      status:'unpaid'
    };
    if (totalPayments.length==11) {
      levelPaymentData.amount=500*5
    }
    await indirectIncomeCollection.insertOne(levelPaymentData)
    sponserID = await UsersCollection.findOne({username: sponserID.sponsorId})
    totalPayments = await indirectIncomeCollection.find({username:sponserID.sponsorId,level:2,whos:req.body.username}).toArray()
    if (sponserID.sponsorId!=''&&totalPayments.length<15) {
      let levelPaymentData = {
        username: sponserID.sponsorId,
        date: now.toLocaleString('en-US', options),
        level: 2,
        amount: 50,
        whos: req.body.username,
        status:'unpaid'
      };
      await indirectIncomeCollection.insertOne(levelPaymentData)
      sponserID = await UsersCollection.findOne({username: sponserID.sponsorId})
      totalPayments = await indirectIncomeCollection.find({username:sponserID.sponsorId,level:3,whos:req.body.username}).toArray()
    if (sponserID.sponsorId!=''&&totalPayments.length<15) {
      let levelPaymentData = {
        username: sponserID.sponsorId,
        date: now.toLocaleString('en-US', options),
        level: 3,
        amount: 40,
        whos: req.body.username,
        status:'unpaid'
      };
      await indirectIncomeCollection.insertOne(levelPaymentData)
      sponserID = await UsersCollection.findOne({username: sponserID.sponsorId})
      totalPayments = await indirectIncomeCollection.find({username:sponserID.sponsorId,level:4,whos:req.body.username}).toArray()
      if (sponserID.sponsorId!=''&&totalPayments.length<15) {
        let levelPaymentData = {
          username: sponserID.sponsorId,
          date: now.toLocaleString('en-US', options),
          level: 4,
          amount: 30,
          whos: req.body.username,
          status:'unpaid'
        };
        await indirectIncomeCollection.insertOne(levelPaymentData)
        sponserID = await UsersCollection.findOne({username: sponserID.sponsorId})
        totalPayments = await indirectIncomeCollection.find({username:sponserID.sponsorId,level:5,whos:req.body.username}).toArray()
        if (sponserID.sponsorId!=''&&totalPayments.length<15) {
          let levelPaymentData = {
            username: sponserID.sponsorId,
            date: now.toLocaleString('en-US', options),
            level: 5,
            amount: 20,
            whos: req.body.username,
            status:'unpaid'
          };
          await indirectIncomeCollection.insertOne(levelPaymentData)
          sponserID = await UsersCollection.findOne({username: sponserID.sponsorId})
          totalPayments = await indirectIncomeCollection.find({username:sponserID.sponsorId,level:6,whos:req.body.username}).toArray()
          if (sponserID.sponsorId!=''&&totalPayments.length<15) {
            let levelPaymentData = {
              username: sponserID.sponsorId,
              date: now.toLocaleString('en-US', options),
              level: 6,
              amount: 10,
              whos: req.body.username,
              status:'unpaid'
            };
            await indirectIncomeCollection.insertOne(levelPaymentData)
          }
        }
      }
    }
    }
  }

    client.close();

    res.json({ success: true, payment: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});
// payment details by the users 
router.get('/payment/:username', async (req, res) => {
    try {
        const username = req.params.username;
      // Connect to MongoDB
      const client = await MongoClient.connect(mongoURL);
      const db = client.db(dbName);
      // Add payment to the 'payments' collection
      const result = await db.collection('payments').find({ username }).toArray();
      client.close();
      res.json({ success: true, payment: result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });
//
router.get('/income/:username', async (req, res) => {
    try {
        const username = req.params.username;
      // Connect to MongoDB
      const client = await MongoClient.connect(mongoURL);
      const db = client.db(dbName);
      // Add payment to the 'payments' collection
      const result = await db.collection('indirectIncomeCollection').find({ username }).toArray();
      client.close();
      res.json({ success: true, payment: result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });


module.exports = router;
