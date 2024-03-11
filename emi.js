const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { sendMessage } = require('./whatsapp');
const moment = require('moment');

// MongoDB connection URL
const mongoURL = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'VisionKalyan_New';
const paymentsCollection = 'payments';
const usersCollection = 'users';


router.get('/getemibydate/:date', async (req, res) => {
  const  {date}  = req.params;
  const client = new MongoClient(mongoURL);
  try {
    await client.connect();
    const db = client.db(dbName);
      const dateRegexPattern = new RegExp(`^${date}`);
    // console.log(date);
    const result = await db.collection(paymentsCollection).aggregate([
      {
        $match: {
          date: { $regex: dateRegexPattern },
        },
      },
      {
        $lookup: {
          from: usersCollection,
          localField: 'username',
          foreignField: 'username',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $project: {
          username: 1,
          date: 1,
          name: '$userDetails.name', // assuming the name field in usersCollection is 'name'
          // add other fields as needed
        },
      },
    ]).toArray();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});

router.get('/', async (req, res) => {
  const client = new MongoClient(mongoURL);

  try {
    await client.connect();
    const db = client.db(dbName);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Find distinct usernames from payments collection for the current month
    const usersWithPayments = await db.collection('payments').distinct('username', {
      date: {
        $gte: new Date(currentYear, currentMonth - 1, 1), // Start of current month
        $lt: new Date(currentYear, currentMonth, 1) // Start of next month
      }
    });

    // Define the aggregation pipeline for users without payments for the current month
    const usersWithoutPaymentsPipeline = [
      {
        $match: {
          username: { $nin: usersWithPayments }
        }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          name: 1,
          phoneNumber: 1
        }
      }
    ];

    // Aggregate users collection
    const usersWithoutPayments = await db.collection('users').aggregate(usersWithoutPaymentsPipeline).toArray();

    res.status(200).json(usersWithoutPayments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});






module.exports = router;
