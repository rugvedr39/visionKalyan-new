// paymentRoutes.js

const express = require('express');
const router = express.Router();
const { MongoClient,ObjectId } = require('mongodb');

// MongoDB connection URL
const mongoURL = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'VisionKalyan_New';



router.post('/create-user', async (req, res) => {
    const client = await MongoClient.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });
    let db = client.db(dbName);
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
            pin
          } = req.body;

          // Validate the username format (starting with VK and followed by 8 digits)
          let username;
          let existingUser;

          // Ensure the database connection is established
          await client.connect();
          const db = client.db(dbName);
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
        const epinExists = await validateEpin(db, sponsorId || 'admin',pin); 
      // Function to validate if the E-pin exists for the specified sponsor ID
    async function validateEpin(db, sponsorId, pin) {
        try {
          let existingEpin = await db.collection('epins').findOne({
            userId: sponsorId,
            pins: { $in: [pin] } // Use $in to check if pin exists in the array
          });
            console.log(existingEpin)
          if (existingEpin==null) {
              console.log("inside")
            existingEpin = await db.collection('epins').findOne({
              userId: 'VK24496086',
              pins: { $in: [pin] } // Use $in to check if pin exists in the array
            });
          }
          return existingEpin ? true : false;
        } catch (error) {
          console.error(error);
          throw error;
        }
      }
      
        if (!epinExists) {
          return res.status(404).json({ success: false, message: 'E-pin not found for the sponsor or admin' });
        }
        await deleteUsedPin(db, sponsorId || 'admin', pin);
          // Create the new user
          const createdAt = new Date().toISOString();
          const newUser = {
            username,
            name,
            password,
            panNumber,
            sponsorId,
            createdAt,
            phoneNumber,
            bankDetails,
            downline,
            email,
          };
          // Insert the new user into the collection
          const result = await db.collection('users').insertOne(newUser);
          await updateDownlineLevels(db, sponsorId, username, 1, result.insertedId);
          const now = new Date();
          const options= Intl.DateTimeFormatOptions = {
             timeZone: 'Asia/Kolkata',
             hour12: false,
           };
          await db.collection('payments').insertOne({ username:username, date:now.toLocaleString('en-US', options) });
          client.close();
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
        const options= Intl.DateTimeFormatOptions = {
           timeZone: 'Asia/Kolkata',
           hour12: false,
         };
        if (level <= 6) {
            // Update the sponsor's downline for the current level
            await db.collection('users').updateOne(
                { username: sponsorId },
                { $push: { downline: { username, level, userId } } }
                );
                // Get the sponsor's sponsor ID
                if(level==1){
                  let levelPaymentData = {
                    username: sponsorId,
                    date: now.toLocaleString('en-US', options),
                    level: 1,
                    amount: 500,
                    whos: username,
                    status:'unpaid'
                  };
                  if (levelPaymentData.username!='') {
                    await db.collection('indirectIncomeCollection').insertOne(levelPaymentData)
                  }
                }
                if (level==2) {
                  let levelPaymentData = {
                    username: sponsorId,
                    date: now.toLocaleString('en-US', options),
                    level: 2,
                    amount: 50,
                    whos: username,
                    status:'unpaid'
                  };
                  await db.collection('indirectIncomeCollection').insertOne(levelPaymentData)
                }
                if (level==3) {
                  let levelPaymentData = {
                    username: sponsorId,
                    date: now.toLocaleString('en-US', options),
                    level: 3,
                    amount: 40,
                    whos: username,
                    status:'unpaid'
                  };
                  await db.collection('indirectIncomeCollection').insertOne(levelPaymentData)
                }
                if (level==4) {
                  let levelPaymentData = {
                    username: sponsorId,
                    date: now.toLocaleString('en-US', options),
                    level: 4,
                    amount: 30,
                    whos: username,
                    status:'unpaid'
                  };
                  await db.collection('indirectIncomeCollection').insertOne(levelPaymentData)
                }
                if (level==5) {
                  let levelPaymentData = {
                    username: sponsorId,
                    date: now.toLocaleString('en-US', options),
                    level: 5,
                    amount: 20,
                    whos: username,
                    status:'unpaid'
                  };
                  await db.collection('indirectIncomeCollection').insertOne(levelPaymentData)
                }
                if (level==6) {
                  let levelPaymentData = {
                    username: sponsorId,
                    date: now.toLocaleString('en-US', options),
                    level: 6,
                    amount: 10,
                    whos: username,
                    status:'unpaid'
                  };
                  await db.collection('indirectIncomeCollection').insertOne(levelPaymentData)
                }
                const sponsor = await db.collection('users').findOne({ username: sponsorId });
                const nextSponsorId = sponsor ? sponsor.sponsorId : null;
    
    
          // Recursively update downline levels for the next sponsor
          if (nextSponsorId) {
            await updateDownlineLevels(db, nextSponsorId, username, level + 1, userId);
          }
        }
      }
      async function deleteUsedPin(db, sponsorId, pin) {
        try {
          await db.collection('epins').updateOne(
            { userId: sponsorId },
            { $pull: { pins: pin } }
          );
        } catch (error) {
          console.error(error);
          throw error;
        }
      };


      router.get('/get-all-users', async (req, res) => {
        const client = await MongoClient.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const db = client.db(dbName);
    
            const users = await db.collection('users').find({}, {
                projection: {
                    username: 1,
                    name: 1,
                    phoneNumber: 1,
                    createdAt: 1,
                    activationDate: 1,
                    password: 1,
                    sponsorId:1,
                    _id: 0 // Exclude the MongoDB _id field
                }
            }).toArray();
            client.close();
            res.json({ success: true, users });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    });

    router.get('/countUsers', async (req, res) => {
        const client = await MongoClient.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            const db = client.db(dbName);
    
            const user = await  db.collection('users').countDocuments()
    
            client.close();
            res.json({ success: true, user });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    })

    router.get('/users/:username', async (req, res) => {
      const username = req.params.username;
      const client = await MongoClient.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });
      try {
          await client.connect();
          const db = client.db(dbName);
  
          const user = await  db.collection('users').findOne({username: username});
  
          client.close();
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
    const updateFields = req.body; // Assuming you send the fields to update in the request body

    // Connect to MongoDB
    const client = await MongoClient.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db(dbName);

    // Update the user by ID
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) }, 
      { $set: updateFields }
    );

    client.close();

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


    module.exports = router;
