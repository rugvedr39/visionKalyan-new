const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const sdk = require('api')('@waapi/v1.0#ehy7f2rlp03cxd0');
sdk.auth('t0wD644lvq413rmF02Hx2TRpdOhBTmsd6Z1KjmIM');
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
  const client = new MongoClient(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);

    // Extract months and years from the date field and filter out non-current data
    const nonCurrentPayments1 = await db.collection(paymentsCollection).find().toArray();
    let filteredData = nonCurrentPayments1.map((payment) => {
      const date = new Date(payment.date);
      return {
        _id: payment._id,
        username: payment.username,
        date: date,
        month: date.getMonth() + 1, // Adding 1 because months are zero-based
        year: date.getFullYear()
      };
    });

    filteredData = filteredData.filter((payment) => {
      const currentMonth = new Date().getMonth() + 1; // Adding 1 because months are zero-based
      const currentYear = new Date().getFullYear();
      return payment.month !== currentMonth || payment.year !== currentYear;
    });

    // Find distinct usernames
    const distinctUsernames = [...new Set(filteredData.map((payment) => payment.username))];

    // Use $lookup to get phone number from the 'users' collection
    const result = await db.collection(paymentsCollection).aggregate([
      {
        $match: {
          username: { $in: distinctUsernames },
        },
      },
      {
        $group: {
          _id: "$username",
          userDetails: { $first: "$$ROOT" }
        }
      },
      {
        $replaceRoot: { newRoot: "$userDetails" }
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
          _id: 1,
          username: 1,
          name: '$userDetails.name',
          phone: '$userDetails.phoneNumber', // Assuming the field in 'users' collection is 'phoneNumber'
        },
      },
      {
        $match: {
          $or: [
            { month: { $ne: new Date().getMonth() + 1 } },
            { year: { $ne: new Date().getFullYear() } },
          ],
        },
      },
    ]).toArray();

    const createEMIMessage = (recipientName, accountID, pendingEMIAmount) => {
      return `
      Hi ${recipientName},

      I wanted to bring to your attention that we have noticed that the EMI for your account with ID ${accountID} is pending for this month. We kindly request you to make the payment at your earliest convenience to avoid any inconvenience.

      Please find the details below:
      - Account ID: ${accountID}
      - Pending EMI Amount: ${pendingEMIAmount}

      You can make the payment through Our Website to the following account:

      If you have already made the payment, please disregard this message.

      Thank you for your prompt attention to this matter. Feel free to reach out if you have any questions or concerns.

      Best regards,
      Vision Kalyan`;
    };

    // for (let index = 0; index < result.length; index++) {
    //   try{
    //     const countryCode = '91';
    //     const formattedNumber = result[index].phone.startsWith('+') ? `${countryCode}${result[index].phone.slice(1)}` : `${countryCode}${result[index].phone}`;
    //     // const formattedNumber = '918600988002';
    //     let message = createEMIMessage(result[index].name, result[index].username, 2000).toString();
    //     const response = await sdk.postInstancesIdClientActionSendMessage({
    //         chatId: `${formattedNumber}@c.us`,
    //         message,
    //       }, { id: '3009' });

    //   }catch(e){
    //     console.log(e);
    //   }

    // }
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});




module.exports = router;
