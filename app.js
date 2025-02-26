const express = require('express');
const { ObjectId } = require('mongodb');
const ExcelJS = require('exceljs');
var cron = require('node-cron');
const fs = require('fs');
const bodyParser = require('body-parser');
const paymentRoutes = require('./paymentRoutes');
const usersRoutes = require('./UserRoutes');
const loginRoutes = require('./loginRoutes');
const payoutRoutes = require('./payoutRoutes');
const projects = require('./land-project');
const { sendMessage } = require('./whatsapp');
const emi = require('./emi');
const updateUser = require('./updateUser');
const extraemi = require('./extraEMI');
require('dotenv').config();
var morgan = require('morgan')
const app = express();
const port = process.env.PORT || 3001;
var admin = require("firebase-admin");
const { sendFileMessage } = require('./whatsapp');
app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const { connectToMongoDB } = require('./db');
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});


app.post('/generate-epins', async (req, res) => {
  try {
      const { userId, count } = req.body;
      const db = await connectToMongoDB();

      // Generate unique E-pins
      const generatedPins = [];
      while (generatedPins.length < count) {
          const newPin = Math.random().toString(36).substring(2, 10).toUpperCase();
          if (generatedPins.indexOf(newPin) === -1) {
              generatedPins.push(newPin);
          }
      }

      await db.collection('epins').updateOne(
          { userId },
          { $addToSet: { pins: { $each: generatedPins } } },
          { upsert: true } // Create a new document if it doesn't exist
      );

      res.json({ success: true, epins: generatedPins });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


//
app.get('/epins/:username', async (req, res) => {
  try {
      const username = req.params.username;
      const db = await connectToMongoDB();

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
  }
});

//
app.get('/all-epins', async (req, res) => {
  try {
      const db = await connectToMongoDB()
      const results = await db.collection('epins').find().toArray();
      res.json({ success: true, allEpins: results });
  } catch (error) {
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


app.post('/send',async (req,res)=>{
  const receivedToken = req.body.fcmToken;
  const payload = {
    notification: {
        title: 'Title of the notification',
        body: 'Body of the notification'
    }
};
  admin.messaging().sendToDevice(receivedToken, payload)
    .then(response => {
        console.log('Notification sent successfully:', response);
    })
    .catch(error => {
        console.error('Error sending notification:', error);
    });
})

  app.get('/topusers', async (req, res) => {
    try {
      const db = await connectToMongoDB()
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
            image:1,
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
        { $limit: 10 },
      ]).toArray();
      res.json({ success: true, topUsers: topUsers });
    } catch (error) {
      console.error('Error:', error);
    }
  })

  app.post('/send-Whatsapp', async (req, res) => {
    try {
      const { number, message } = req.body;
      await sendMessage(number, message);
      res.status(200).json({ data: 'Successful Sent Message' });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });


  app.post('/newVkpayment', async (req, res) => {
    try {
      const { EmiAmount, sposerAmount, times } = req.body;
  
      if (!EmiAmount || !sposerAmount || !times) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
  
      const db = await connectToMongoDB();
      const collection = db.collection('newVkpayment');
  
      const newPayment = {
        EmiAmount,
        sposerAmount,
        times,
        createdAt: new Date() // Storing timestamp
      };
  
      const result = await collection.insertOne(newPayment);
  
      if (result.acknowledged) {
        res.status(200).json({ message: 'Payment successfully stored', data: newPayment });
      } else {
        res.status(500).json({ error: 'Failed to store payment' });
      }
  
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  app.get('/newVkpayment', async (req, res) => {
    try {
      const db = await connectToMongoDB();
      const collection = db.collection('newVkpayment');
  
      const payments = await collection.find({}).toArray();
  
      res.status(200).json({ data: payments });
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });

app.use('/users',usersRoutes);
app.use('/payments', paymentRoutes);
app.use('/users', loginRoutes);
app.use('/payouts', payoutRoutes);
app.use('/projects', projects);
app.use('/emi', emi);
app.use('/updateUser', updateUser);
app.use('/extraemi', extraemi);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const fetchDataAndGenerateExcel = async () => {
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

    // console.log(totalAmountsByUser, unpaidIds);

    const totalAmountsByUser1 = totalAmountsByUser.map((entry) => ({
      Name: entry.userDetails?.name,
      username: entry.userDetails?.username,
      'Bank Name': entry.userDetails?.bankDetails?.bankName,
      'Bank IFSC Code': entry.userDetails?.bankDetails?.ifscCode,
      'Bank Account Number': entry.userDetails?.bankDetails?.accountNumber,
      'PAN Number': entry.userDetails?.panNumber,
      'Total Income': entry.amount,
      'TDS': entry.amount*0.05,
      'Net Payable': entry.amount-entry.amount*0.05,
      ids:entry.ids,
      "Date": new Date()
    }));


    // Generate Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Total Amounts');

    // Add header row
    worksheet.addRow(['Name', 'Bank Name', 'Bank IFSC Code', 'Bank Account Number', 'Pan Number', 'Amount', 'TDS', 'Net Payable']);

    // Add data rows
    for (const userEntry of totalAmountsByUser) {
      const { userDetails, amount } = userEntry;
      console.log(userDetails);
      const { name, bankDetails, panNumber } = userDetails;

      // Assuming bankDetails is an array with an object containing bank information
      const { bankName, ifscCode, accountNumber } = bankDetails || {};

      // Calculate TDS and Net Payable
      const tds = 0.05 * amount; // 5% of Total Income
      const netPayable = amount - tds;

      worksheet.addRow([name, bankName, ifscCode, accountNumber, panNumber, amount, tds, netPayable]);
    }

    // Save Excel file
    await db.collection('PaymentProccedDetails').insertOne({unpaidIds,data:totalAmountsByUser1});
    const objectIdsToUpdate = unpaidIds.map(id => new ObjectId(id));
    await db.collection('indirectIncomeCollection').updateMany(
      { _id: { $in: objectIdsToUpdate } },
      { $set: { status: 'Payment Under Process' } }
      );

    const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '_');
    const excelFileName = `Payout_Summary_${currentDate}.xlsx`;
    await workbook.xlsx.writeFile(excelFileName);

    sendFileMessage("917276275559", excelFileName, excelFileName)
    .then(() => {
        fs.unlinkSync(excelFileName);
        console.log('File deleted successfully');
    })
    .catch(error => {
      console.error('Error sending file:', error);
    });
  } catch (error) {
    console.error('Error:', error);
  }
};

cron.schedule('0 23 * * *', async () => {
  console.log('Running cron job...');
  await fetchDataAndGenerateExcel();
  console.log('Cron job completed.');
});

