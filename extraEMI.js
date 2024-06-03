const express = require('express');
const router = express.Router();
const { connectToMongoDB } = require('./db');
const extraemicollections = 'ExtraEMICollections';

// Function to connect to MongoDB

router.get('/:username', async function (req, res) {
  try {
    const username = req.params.username;

    // Connect to MongoDB
    const db = await connectToMongoDB();

    // Retrieve data by username
    const userData = await db.collection(extraemicollections).find({ username }).toArray();
    res.json(userData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/:username', async function (req, res) {
  try {
    const username = req.params.username;
    const { date, amount } = req.body;

    // Connect to MongoDB
    const db = await connectToMongoDB();

    // Save data by username, date, and amount
    await db.collection(extraemicollections).insertOne({ username, date, amount });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post('/delete/:username', async function (req, res) {
    try {
      const username = req.params.username;
      const  amountToSubtract  = req.body.amount;
      const db = await connectToMongoDB();
      const userCollections = await db.collection(extraemicollections).find({ username }).toArray();
      let remainingAmount = amountToSubtract;
      for (const userCollection of userCollections) {
        const collectionId = userCollection._id;
        const collectionAmount = userCollection.amount || 0;
        if (remainingAmount >= collectionAmount) {
          // Remove the entire collection
          // console.log('colledction ID:'+collectionId);
          await db.collection(extraemicollections).deleteOne({ _id: collectionId });
          remainingAmount -= collectionAmount;
        } else {
          // Subtract the remaining amount from the current collection
          await db.collection(extraemicollections).updateOne(
            { _id: collectionId },
            { $set: { amount: collectionAmount - remainingAmount } }
          );
          break;
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
module.exports = router;
