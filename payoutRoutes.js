
const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const { sendMessage } = require('./whatsapp');
const { connectToMongoDB } = require('./db');

const createEMIMessage = (recipientName, accountID, pendingEMIAmount, bankAccount) => {
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

// Fetch payout details
router.get('/payoutdetails', async (req, res) => {
  try {
    const db = await connectToMongoDB();

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
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/procced', async (req, res) => {
  try {
    const db =  await connectToMongoDB();
    await db.collection('PaymentProccedDetails').insertOne(req.body);
    const objectIdsToUpdate = req.body.unpaidIds.map(id => new ObjectId(id));
    await db.collection('indirectIncomeCollection').updateMany(
      { _id: { $in: objectIdsToUpdate } },
      { $set: { status: 'Payment Under Process' } }
    );
    res.json({ success: true, message: 'Payments Procced' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/get/procced', async (req, res) => {
  try {
    const db =  await connectToMongoDB();
    const result = await db.collection('PaymentProccedDetails').find().toArray();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/procced/paid', async (req, res) => {
  try {
    const db =  await connectToMongoDB();
    const PaymentProccedDetailsCollection = db.collection('PaymentProccedDetails');
    const UsersCollection = db.collection('users');
    const indirectIncomeCollection = db.collection('indirectIncomeCollection');
    const payoutpaymentscollections = db.collection('RecentPayments');
    let user = await UsersCollection.findOne({ username: req.body.username });

    const message = createEMIMessage(user.name, user.username, req.body['Net Payable'], user.bankDetails?.accountNumber);
    const objectIdsToUpdate = req.body.ids.map(id => new ObjectId(id));
    // Update IndirectIncomeCollection
    await indirectIncomeCollection.updateMany(
      { _id: { $in: objectIdsToUpdate } },
      { $set: { status: 'paid' } }
    );

    // Update PaymentProccedDetailsCollection
    const result = await PaymentProccedDetailsCollection.updateOne(
      { _id: new ObjectId(req.body.id) },
      { $pull: { data: { Name: req.body.Name } } }
    );

    // Insert into RecentPayments collection

    // Check if data array is empty and delete the document
    const result1 = await PaymentProccedDetailsCollection.findOne({ _id: new ObjectId(req.body.id) });
    if (result1.data.length === 0) {
      await PaymentProccedDetailsCollection.findOneAndDelete({ _id: new ObjectId(req.body.id) });
    }
    delete req.body.id;
    await payoutpaymentscollections.insertOne(req.body);

    const countryCode = '91';
    let phoneNumberString = String(user.phoneNumber); // Convert to string if it's not already
    const formattedNumber = phoneNumberString.startsWith('+') ? `${countryCode}${phoneNumberString.slice(1)}` : `${countryCode}${phoneNumberString}`;

    await sendMessage(formattedNumber, message);

    res.status(200).json({ data: 'Successful' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/payment/done-get', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const payoutPaymentsCollections = db.collection('RecentPayments');

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1); // Ensure page is at least 1
    const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1); // Ensure limit is at least 1
    const searchTerm = req.query.search || '';
    const skip = (page - 1) * limit;


    console.log('Page:', page, 'Limit:', limit);

    const query = searchTerm
    ? {
        $or: [
          { Name: { $regex: searchTerm, $options: 'i' } },
          { 'Bank Name': { $regex: searchTerm, $options: 'i' } },
          { 'Bank IFSC Code': { $regex: searchTerm, $options: 'i' } },
          { 'Bank Account Number': { $regex: searchTerm, $options: 'i' } },
          { 'PAN Number': { $regex: searchTerm, $options: 'i' } },
          { 'Total Income': { $regex: searchTerm, $options: 'i' } },
          { TDS: { $regex: searchTerm, $options: 'i' } },
          { 'Net Payable': { $regex: searchTerm, $options: 'i' } }
        ]
      }
    : {};

    const result = await payoutPaymentsCollections
      .find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const totalItems = await payoutPaymentsCollections.countDocuments();
    res.status(200).json({ 
      data: result,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });

    console.log('Result Length:', result.length);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});




router.get('/payment/payout/:username', async (req, res) => {
  const username = req.params.username;
  try {
    const db =  await connectToMongoDB();
    const payoutpaymentscollections = db.collection('RecentPayments');
    const result = await payoutpaymentscollections.find({ username }).toArray();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

module.exports = router;
