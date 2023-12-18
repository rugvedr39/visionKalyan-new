const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { JWT } = require('google-auth-library');
const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection URL
const mongoURL = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'VisionKalyan_New';
const credentials = require('./asstets/visionkalyan-aee28f9bb9ac.json');


router.post('/upload/:userId', upload.single('image'), async (req, res) => {
  const jwtClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  // Use a promise to ensure the access token is available
  const getAccessToken = async () => {
    try {
      const tokens = await jwtClient.authorize();
      return tokens.access_token;
    } catch (error) {
      throw error;
    }
  };
  const redirectUri = credentials.web?.redirect_uris?.[0] || 'http://localhost:3000/callback';
  const oAuth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    redirectUri
  );
  async function main() {
      try {
        const accessToken = await getAccessToken();
        oAuth2Client.setCredentials({ access_token: accessToken });
        // Continue with the rest of your code
        // ...
      } catch (error) {
        console.error('Error getting access token:', error);
      }
    }
    // Call the async function
    main();
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });
  try {
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
    // Delete the temporary file
    require('fs').unlinkSync(req.file.path);

    const userId = req.params.userId;

    // Connect to MongoDB
    const client = await connectToMongoDBWithRetry();
    const db = client.db(dbName);

    // Fetch the current user data
    const currentUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!currentUser) {
      client.close();
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

    client.close();

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

const connectToMongoDBWithRetry = async () => {
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
};

module.exports = router;
