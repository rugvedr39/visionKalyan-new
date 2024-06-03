const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('./db');
const collectionName = 'lands';



// Create
router.post('/lands', async (req, res) => {
  try {
    const db = await connectToMongoDB();

    const result = await db.collection(collectionName).insertOne(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Read
router.get('/lands', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    
    const lands = await db.collection(collectionName).find().toArray();
    res.json(lands);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update
router.put('/lands/:id', async (req, res) => {
  try {
    const db =await connectToMongoDB();
    
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
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/lands/:id', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const result = await db.collection(collectionName).deleteOne({ _id: ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Land not found' });
    } else {
      res.json({ message: 'Land deleted successfully' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
module.exports = router;