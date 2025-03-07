
// paymentRoutes.js

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { sendMessage } = require('./whatsapp');
const { connectToMongoDB } = require('./db');

const createEMIMessage = (recipientName, accountID) => {
  return `
  Hi ${recipientName},

We're delighted to inform you that your account has been created successfully with VisionKalyan Infra Pvt. Ltd. Welcome aboard!

Account Details:
- Username: ${accountID}

Feel free to log in using the provided username and explore the features and services we offer. If you have any questions or need assistance, don't hesitate to reach out to our support team at +919021615137.

Thank you for choosing Vision Kalyan. We look forward to serving you!

Best regards,
Vision Kalyan`;
};


router.post('/create-user', async (req, res) => {
  try {
      const {
          name,
          password,
          panNumber,
          sponsorId,
          phoneNumber,
          bankDetails,
          downline,
          email,
          pin,
          emiAmount
      } = req.body;
      let username;
      let existingUser;
      const db = await connectToMongoDB();
      do {
          username = generateUsername();
          existingUser = await db.collection('users').findOne({ username });
      } while (existingUser);

      function generateUsername() {
          const randomCode = Math.floor(10000000 + Math.random() * 90000000); // Generate an 8-digit random code
          return `VK${randomCode}`;
      }

      // Validate if the sponsorId exists
      if (sponsorId) {
          const sponsorExists = await validateSponsorId(db, sponsorId);
          if (!sponsorExists) {
            return res.status(404).json({ success: false, message: 'Sponsor ID not found' });
          }
      }
      // If a sponsorId is provided, validate if it exists
      let epinExists = await validateEpin(db, pin);

      async function validateEpin(db, pin) {
      try {
        let existingEpin = await db.collection('epins').findOne({
            pins: { $in: [pin] } // Use $in to check if pin exists in the array
        });

        return existingEpin ? existingEpin.userId : null;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

      if (!epinExists) {
          return res.status(404).json({ success: false, message: 'E-pin not found for the sponsor or admin' });
      }
      await deleteUsedPin(db, pin);
      // Create the new user
      const userIdObjectId = new ObjectId('65c050bdda616ec50817b86f');
      const counter = await db.collection('counters').findOneAndUpdate(
        { _id: userIdObjectId },
        { $inc: { sequence_value: 1 } },
        { returnDocument: 'after' }
      );
      const createdAt = new Date().toISOString();
      const newUser = {
          serialNumber: counter.sequence_value,
          username,
          name,
          password,
          panNumber,
          sponsorId,
          createdAt,
          EmiAmount:emiAmount,
          phoneNumber,
          bankDetails,
          downline,
          email,
      };
      // Insert the new user into the collection
      const result = await db.collection('users').insertOne(newUser);
      await updateDownlineLevels(db, sponsorId, username, 1, result.insertedId);
      const collection = db.collection('newVkpayment');
      const paymentRecord = await collection.findOne({ EmiAmount: Number(emiAmount) });
      if (!paymentRecord) {
        return res.status(400).json({ error: "Invalid EMI Amount selected." });
    }

    const now = new Date();
    const options = {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
  };

  
      let levelPaymentData = {
        username: sponsorId,
        date: now.toLocaleString('en-US', options),
        level: 1,
        amount: paymentRecord.sposerAmount, 
        whos: result.username,
        status: 'unpaid'
    };

    await db.collection('indirectIncomeCollection').insertOne(levelPaymentData);




    const formattedDate = now.toLocaleString('en-US', options).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$1-$2,');
    await db.collection('payments').insertOne({ username: username, date: formattedDate });
      const message = createEMIMessage(newUser.name, newUser.username)
      const countryCode = '91';
    const formattedNumber = newUser.phoneNumber.startsWith('+') ? `${countryCode}${newUser.phoneNumber.slice(1)}` : `${countryCode}${newUser.phoneNumber}`;
      await sendMessage(formattedNumber, message);
      res.json({ success: true, user: newUser });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

    // Function to validate if the sponsor ID exists
    async function validateSponsorId(db, sponsorId) {
        // Check if the sponsorId exists in the users collection
        const existingUser = await db.collection('users').findOne({ username: sponsorId });
        return existingUser ? true : false;
      }

      // Function to update downline levels recursively
      async function updateDownlineLevels(db, sponsorId, username, level, userId) {
        const now = new Date();
        const options = {
            timeZone: 'Asia/Kolkata',
            hour12: false,
        };
    
        if (level <= 6) {
            await db.collection('users').updateOne(
                { username: sponsorId },
                { $push: { downline: { username, level, userId } } }
            );
            const paymentAmounts = [500, 50, 40, 30, 20, 10];

            const payments = await collection.find({}).toArray();

            let levelPaymentData = {
                username: sponsorId,
                date: now.toLocaleString('en-US', options),
                level: level,
                amount: paymentAmounts[level - 1], 
                whos: username,
                status: 'unpaid'
            };
            // await db.collection('indirectIncomeCollection').insertOne(levelPaymentData);
            const sponsor = await db.collection('users').findOne({ username: sponsorId });
            const nextSponsorId = sponsor ? sponsor.sponsorId : null;
            if (nextSponsorId) {
                await updateDownlineLevels(db, nextSponsorId, username, level + 1, userId);
            }
        }
    }
      async function deleteUsedPin(db, pin) {
        try {
            await db.collection('epins').updateOne(
                { pins: pin },
                { $pull: { pins: pin } }
            );
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    router.get('/get-all-users', async (req, res) => {
      try {
        const db = await connectToMongoDB();
        const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
        const pageSize =30; // Number of items per page
        const searchTerm = req.query.search || ''; // Search term for filtering
    
        // Build the query for search
        const query = searchTerm
          ? {
              $or: [
                { username: { $regex: searchTerm, $options: 'i' } }, // Case-insensitive search
                { name: { $regex: searchTerm, $options: 'i' } },
                { phoneNumber: { $regex: searchTerm, $options: 'i' } },
              ],
            }
          : {};
    
        // Fetch users with pagination and projection
        const users = await db
          .collection('users')
          .find(query, {
            projection: {
              username: 1,
              name: 1,
              phoneNumber: 1,
              createdAt: 1,
              activationDate: 1,
              password: 1,
              sponsorId: 1,
              serialNumber: 1,
              _id: 0,
            },
          })
          .sort({ serialNumber: -1 }) // Sort by createdAt in descending order
          .skip((page - 1) * pageSize) // Skip documents for pagination
          .limit(pageSize) // Limit the number of documents returned
          .toArray();
    
        // Get the total number of documents matching the query
        const totalItems = await db.collection('users').countDocuments(query);

        console.log(totalItems);
        console.log(pageSize);
        
        
    
        // Calculate total pages
        const totalPages = Math.ceil(totalItems / pageSize);
    
        // Send response
        res.json({
          success: true,
          users,
          totalItems,
          totalPages,
          currentPage: page,
        });
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });
    

    router.get('/countUsers', async (req, res) => {
        try {
            const db = await connectToMongoDB();
            const user = await  db.collection('users').countDocuments()
            res.json({ success: true, user });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    })

    router.get('/users/:username', async (req, res) => {
      const username = req.params.username;
      try {
          const db = await connectToMongoDB();
          const user = await  db.collection('users').findOne({username: username});
          res.json({ success: true, user });
      } catch (error) {
          console.error(error);
          res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });



    // Update user by ID
router.put('/update/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const updateFields = req.body;
    const db = await connectToMongoDB();

    // Update the user by ID
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateFields }
    );
    if (result.modifiedCount > 0) {
      res.json({ success: true, message: 'User updated successfully' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/achivers/:userId/:fromdate/:todate', async (req, res) => {
  try {
    const userId = req.params.userId;
    const toDate = req.params.todate;
    const fromDate = req.params.fromdate;
    const fromDateObject = new Date(fromDate.split('-').reverse().join('-'));
    const toDateObject = new Date(toDate.split('-').reverse().join('-'));
    const db = await connectToMongoDB();
    const user = await db.collection('users').findOne({ username: userId });
    if (user && user.downline && user.downline.length > 0) {
      // const downlineUsernames = user.downline.map(item => item.username);
      const downlineUsernames = user.downline.filter(item=>item.level===1).map(item => item.username);
      const downlineCreatedAtData = await db.collection('users').find({ username: { $in: downlineUsernames },
        createdAt: {
          $gte: fromDateObject.toISOString(),
          $lt: toDateObject.toISOString()
        }
      })
        .project({ username: 1, createdAt: 1 })
        .toArray();
      res.status(200).json({ success: true, data: downlineCreatedAtData });
    } else {
      res.status(404).json({ success: false, message: 'User not found or downline is empty' });
    }
  } catch (error) {
    console.error('Error fetching achievers:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});
router.get('/upcoming-birthdays', async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const today = new Date();
    const upcomingDays = 30; // Adjust this to get birthdays within the next 'n' days
    const upcomingDate = new Date();
    upcomingDate.setDate(today.getDate() + upcomingDays);

    const users = await db.collection('users').find({
      dob: {
        $gte: today.toISOString().split('T')[0],
        $lte: upcomingDate.toISOString().split('T')[0]
      }
    }, {
      projection: {
        name: 1,
        phoneNumber: 1,
        dob: 1,
        _id: 0
      }
    }).toArray();

    const formattedUsers = users.map(user => {
      const dob = new Date(user.dob);
      const day = dob.getDate().toString().padStart(2, '0');
      const month = (dob.getMonth() + 1).toString().padStart(2, '0');
      const year = dob.getFullYear();
      const formattedDob = `${day}-${month}-${year}`;
      return {
        name: user.name,
        phoneNumber: user.phoneNumber,
        dob: formattedDob
      };
    });

    res.json({ success: true, users: formattedUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});
module.exports = router;
