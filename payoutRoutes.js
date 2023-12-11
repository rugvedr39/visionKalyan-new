<<<<<<< HEAD
=======
const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

const url = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'VisionKalyan_New';

const sdk = require('api')('@waapi/v1.0#ehy7f2rlp03cxd0');
sdk.auth('t0wD644lvq413rmF02Hx2TRpdOhBTmsd6Z1KjmIM');

const createEMIMessage = (recipientName, accountID, pendingEMIAmount , bankAccount) => {
  return `
  Hi ${recipientName},

I wanted to share the good news with you – your account (${bankAccount}) has been successfully credited with the amount of ${pendingEMIAmount} 

Details:
- User ID: ${accountID}
- Credited Amount: ${pendingEMIAmount}

If you have any questions or concerns regarding this credit, feel free to reach out to us. We're here to assist you.

Thank you for your continued association with us.

Best regards,
Vision Kalyan`;
};

// Middleware to handle database connection
const withDb = async (req, res, next) => {
  try {
    const client = new MongoClient(url);
    await client.connect();
    req.db = client.db(dbName);
    next();
  } catch (error) {
    console.error('Error connecting to the database:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Fetch payout details
router.get('/payoutdetails', withDb, async (req, res) => {
  try {
    const { db } = req;

    // Fetch all unpaid income
    const indirectIncomeCollectionName = 'indirectIncomeCollection';
    const indirectIncomeCollection = db.collection(indirectIncomeCollectionName);
    const allUnpaidIncome = await indirectIncomeCollection.find({ status: 'unpaid' }).toArray();
    const unpaidIds = allUnpaidIncome.map(entry => entry._id);

    // Calculate total amounts by user
    const totalAmountsByUser = allUnpaidIncome.reduce((result, entry) => {
      const { username, amount, _id } = entry;
      const existingUser = result.find(userEntry => userEntry.username === username);

      if (existingUser) {
        existingUser.amount += amount;
        existingUser.ids.push(_id);
      } else {
        result.push({ username, amount, ids: [_id] });
      }

      return result;
    }, []);

    // Fetch user details for each user
    const collectionName = 'users';
    const collection = db.collection(collectionName);

    for (const userEntry of totalAmountsByUser) {
      const { username } = userEntry;
      const userDetails = await collection.findOne({ username });
      userEntry.userDetails = userDetails;
    }

    res.status(200).json({ totalAmountsByUser, unpaidIds });
  } catch (error) {
    console.error('Error fetching payout details:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/procced', withDb, async (req, res) => {
  try {
    const { db } = req;
    await db.collection('PaymentProccedDetails').insertOne(req.body);
    const objectIdsToUpdate = req.body.unpaidIds.map(id => new ObjectId(id));
    await db.collection('indirectIncomeCollection').updateMany(
      { _id: { $in: objectIdsToUpdate } },
      { $set: { status: 'Payment Under Process' } }
    );
    res.json({ success: true, message: 'Payments Procced' });
  } catch (error) {
    console.error('Error fetching payout details:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/get/procced', withDb, async (req, res) => {
  try {
    const { db } = req;
    const result = await db.collection('PaymentProccedDetails').find().toArray();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching payout details:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


router.post('/procced/paid', withDb, async (req, res) => {
  try {
    const { db } = req;
    const PaymentProccedDetailsCollection = db.collection('PaymentProccedDetails');
    const UsersCollection = db.collection('users');
    const indirectIncomeCollection = db.collection('indirectIncomeCollection');
    const payoutpaymentscollections = db.collection('RecentPayments');
    let user = await UsersCollection.findOne({username:req.body.username});

    // const createEMIMessage = (recipientName, accountID, pendingEMIAmount , bankAccount) => {
    const message = createEMIMessage(user.name,user.username,req.body['Net Payable'],user.bankDetails.accountNumber)
    const objectIdsToUpdate = req.body.ids.map(id => new ObjectId(id));

    // Update IndirectIncomeCollection
    await indirectIncomeCollection.updateMany(
      { _id: { $in: objectIdsToUpdate } },
      { $set: { status: 'paid' } }
    );

    // Update PaymentProccedDetailsCollection
    const result = await PaymentProccedDetailsCollection.updateOne(
      { _id: new ObjectId(req.body._id) },
      { $pull: { data: { Name: req.body.Name } } }
    );

    // Insert into RecentPayments collection
    
    // Check if data array is empty and delete the document
    const result1 = await PaymentProccedDetailsCollection.findOne({ _id: new ObjectId(req.body._id) });
    if (result1.data.length === 0) {
      await PaymentProccedDetailsCollection.findOneAndDelete({ _id: new ObjectId(req.body._id) });
    }
    delete req.body._id;
    await payoutpaymentscollections.insertOne(req.body);

    const countryCode = '91';
    const formattedNumber = user.phoneNumber.startsWith('+') ? `${countryCode}${user.phoneNumber.slice(1)}` : `${countryCode}${user.phoneNumber}`;
    // const formattedNumber = '918600988002';
    const response = await sdk.postInstancesIdClientActionSendMessage({
        chatId: `${formattedNumber}@c.us`,
        message,
      }, { id: '3009' });

    res.status(200).json({ data: 'Successful' });
  } catch (error) {
    console.error('Error updating payment details:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


router.get('/payment/done-get', withDb, async (req, res) => {
  try {
    const { db } = req;
    const payoutpaymentscollections = db.collection('RecentPayments');
    
    const result = await payoutpaymentscollections.find().toArray();
    
    res.status(200).json({ data: result });
  } catch (error) {
    console.error('Error fetching recent payments:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/payment/payout/:username', withDb, async (req, res) => {
  const username = req.params.username;
  try {
    const { db } = req;
    const payoutpaymentscollections = db.collection('RecentPayments');
    const result = await payoutpaymentscollections.find({ username }).toArray();
    res.status(200).json({success: true, data: result });
  } catch (error) {
    console.error('Error fetching recent payments:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
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
module.exports = router;
>>>>>>> 91173d34 (hjged)
