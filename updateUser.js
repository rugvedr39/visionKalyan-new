const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { MongoClient, ObjectId } = require('mongodb');
const { JWT } = require('google-auth-library');
const { connectToMongoDB } = require('./db');

// MongoDB connection URL
const mongoURL = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'VisionKalyan_New';
// const credentials = require('./asstets/visionkalyan-aee28f9bb9ac.json');

router.post('/upload/:userId', upload.single('image'), async (req, res) => {
  try {
    const jwtClient = new JWT({
      email: 'visionkalyan@visionkalyan.iam.gserviceaccount.com',
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    // Get access token using JWT
    const tokens = await jwtClient.authorize();
    const accessToken = tokens.access_token;

    const drive = google.drive({ version: 'v3', auth: accessToken });

    // Upload to Google Drive
    const driveRes = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: ['1FejXlqcHxkw86uvt4sSckX_MKoHj6w2B'],
      },
      media: {
        mimeType: req.file.mimetype,
        body: require('fs').createReadStream(req.file.path),
      },
    });

    // Fetch file information to get webViewLink
    const fileInfo = await drive.files.get({
      fileId: driveRes.data.id,
      fields: 'webViewLink',
    });
    require('fs').unlinkSync(req.file.path);
    const userId = req.params.userId;
    const db = await connectToMongoDB();
    const currentUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If 'image' field doesn't exist in the user's data, create it
    if (!currentUser.image) {
      currentUser.image = {};
    }

    // Update the 'webViewLink' for the 'image' field in the user's data
    currentUser.image.webViewLink = fileInfo.data.webViewLink;

    // Perform the MongoDB update
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: currentUser }
    );
    if (result.modifiedCount > 0) {
      res.json({ success: true, message: 'User updated successfully' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
