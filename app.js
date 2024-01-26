// app.js
const express = require('express');
const { MongoClient,ObjectId } = require('mongodb');
const ExcelJS = require('exceljs');
var cron = require('node-cron');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const bodyParser = require('body-parser');
const paymentRoutes = require('./paymentRoutes');
const usersRoutes = require('./UserRoutes');
const loginRoutes = require('./loginRoutes');
const payoutRoutes = require('./payoutRoutes');
const projects = require('./land-project');
const emi = require('./emi');
const updateUser = require('./updateUser');
const extraemi = require('./extraEMI');
var morgan = require('morgan')
console.log(process.env.SENDGRID_API_KEY);

const app = express();
const port = process.env.PORT || 3000;
app.use(morgan('tiny'));
console.log(process.env.SENDGRID_API_KEY);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Replace '*' with your specific origin
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});


// MongoDB connection URL
const mongoURL = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'VisionKalyan_New';
const client = new MongoClient(mongoURL);


async function connectToMongoDBWithRetry() {
  const maxRetries = 100; // Adjust the number of retries as needed
  let currentRetry = 0;

  while (currentRetry < maxRetries) {
    try {
      // Connect to MongoDB
      const client = await MongoClient.connect(mongoURL);
      return client;
    } catch (error) {
      // console.error(`Error connecting to MongoDB (Attempt ${currentRetry + 1}/${maxRetries}):`, error);
      currentRetry++;

      // Wait for a certain period before the next retry (e.g., 5 seconds)
      const retryDelay = 5000;
      // console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // console.error(`Max retries (${maxRetries}) reached. Unable to establish MongoDB connection.`);
  return null;
}

app.post('/generate-epins', async (req, res) => {
  let client // Declare the client variable outside the try block to make it accessible in the finally block
  try {
      const { userId, count } = req.body;

      // Connect to MongoDB
      client = await connectToMongoDBWithRetry()
      const db = client.db(dbName);

      // Generate unique E-pins
      const generatedPins = [];
      while (generatedPins.length < count) {
          const newPin = Math.random().toString(36).substring(2, 10).toUpperCase();
          if (generatedPins.indexOf(newPin) === -1) {
              generatedPins.push(newPin);
          }
      }

      // Update or insert E-pins without checking if the user already has an E-pin
      await db.collection('epins').updateOne(
          { userId },
          { $addToSet: { pins: { $each: generatedPins } } },
          { upsert: true } // Create a new document if it doesn't exist
      );

      res.json({ success: true, epins: generatedPins });
  } catch (error) {
      // console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
      if (client) {
          // Close the MongoDB connection in the finally block
          client.close();
      }
  }
});


//
app.get('/epins/:username', async (req, res) => {
  let client; // Declare the client variable outside the try block to make it accessible in the finally block
  try {
      const username = req.params.username;
      // Connect to MongoDB
      client = await connectToMongoDBWithRetry()
      const db = client.db(dbName);

      // Find E-pins for the given username
      const result = await db.collection('epins').findOne({ userId: username });
      if (result) {
          res.json({ success: true, epins: result.pins });
      } else {
          res.status(404).json({ success: false, message: 'E-pins not found for the specified user' });
      }
  } catch (error) {
      // console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
      if (client) {
          // Close the MongoDB connection in the finally block
          client.close();
      }
  }
});

//
app.get('/all-epins', async (req, res) => {
  let client; // Declare the client variable outside the try block to make it accessible in the finally block
  try {
      // Connect to MongoDB
      client = await connectToMongoDBWithRetry()
      const db = client.db(dbName);

      // Find all E-pins
      const results = await db.collection('epins').find().toArray();
      res.json({ success: true, allEpins: results });
  } catch (error) {
      // console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
      if (client) {
          // Close the MongoDB connection in the finally block
          client.close();
      }
  }
});




  app.get('/unpaid', async (req, res) => {
    let client; // Declare the client variable outside the try block to make it accessible in the finally block
    try {
        // Connect to MongoDB
        client =await connectToMongoDBWithRetry()
        const db = client.db(dbName);

        // Find all E-pins
        const results = await db.collection('indirectIncomeCollection').updateMany({}, { $set: { status: 'unpaid' } });
        res.json({ success: true, allEpins: results });
    } catch (error) {
        // console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    } finally {
        if (client) {
            // Close the MongoDB connection in the finally block
            client.close();
        }
    }
});


  app.get('/topusers', async (req, res) => {
    try {
      const client =connectToMongoDBWithRetry()
      const db = client.db(dbName);
  
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
      client.close();
    } catch (error) {
      // console.error('Error:', error);
    } finally {
      await client.close();
    }

  })

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
  const url = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
  const dbName = 'VisionKalyan_New';

  try {
    // Connect to the MongoDB database
    const client = await connectToMongoDBWithRetry()
    const db = client.db(dbName);

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

    console.log(totalAmountsByUser, unpaidIds);

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
    // Close the database connection


    // Generate Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Total Amounts');

    // Add header row
    worksheet.addRow(['Name', 'Bank Name', 'Bank IFSC Code', 'Bank Account Number', 'Pan Number', 'Amount', 'TDS', 'Net Payable']);

    // Add data rows
    for (const userEntry of totalAmountsByUser) {
      const { userDetails, amount } = userEntry;
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
      await client.close();


    const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '_');  
    const excelFileName = `Payout_Summary_${currentDate}.xlsx`;
    await workbook.xlsx.writeFile(excelFileName);

    const attachmentContent = fs.readFileSync(excelFileName, 'base64');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
          to: 'rugvedr39@gmail.com',
          from: 'rugved.developer@gmail.com',
          subject: 'Report From Vision Kalyan',
          text: '',
          attachments: [
            {
              content: attachmentContent,
              filename: excelFileName,
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              disposition: 'attachment',
            },
          ],
        };

        sgMail.send(msg)
        .then(() => {
          console.log('Email sent successfully');
          fs.unlinkSync(excelFileName);
        })
        .catch((error) => {
          console.error('Error sending email:', error.response.body);
        });

    console.log('Excel file generated successfully: TotalAmountsWithTDS.xlsx');
  } catch (error) {
    console.error('Error:', error);
  }
};


cron.schedule('0 20 * * *', async () => {
  console.log('Running cron job...');
  await fetchDataAndGenerateExcel();
  console.log('Cron job completed.');
});

