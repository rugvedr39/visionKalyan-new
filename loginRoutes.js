const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('./db');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
      const db = await connectToMongoDB();
      const user = await db.collection('users').findOne({ username });
      if (!user) {
          return res.status(401).json({ success: false, message: 'Invalid username' });
      }
      if (password == user.password) {
          const downlineWithNames = await Promise.all(user.downline.map(async (downlineItem) => {
              const { userId, ...rest } = downlineItem;
              const downlineUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
              const name = downlineUser ? downlineUser.name : 'Unknown';
              return { ...rest, name };
          }));
          user.downline = downlineWithNames;
          res.json({ success: true, data: user });
      } else {
          res.status(401).json({ success: false, message: 'Invalid password' });
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});
module.exports = router;
