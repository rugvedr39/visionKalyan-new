
// paymentRoutes.js

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { sendMessage } = require('./whatsapp.js');

// MongoDB connection URL
const mongoURL = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'VisionKalyan_New';

// Create a new payment
router.post('/add', async (req, res) => {
    let client;
    try {
        const { username, date } = req.body;

        // Connect to MongoDB
        client = await connectToMongoDBWithRetry();
        const db = client.db(dbName);
        const UsersCollection = db.collection('users');
        const indirectIncomeCollectionName = 'indirectIncomeCollection';
        const indirectIncomeCollection = db.collection(indirectIncomeCollectionName);

        // Check if the username is available
        const existingUser = await db.collection('users').findOne({ username });

        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'Username not found' });
        }
        const countryCode = '91';
        const phoneNumberString = String(existingUser.phoneNumber);
        const formattedNumber = phoneNumberString.startsWith('+') ? `${countryCode}${phoneNumberString.slice(1)}` : `${countryCode}${phoneNumberString}`;
        
        let message = createEMIMessage(username,existingUser.name).toString();
        sendMessage(formattedNumber, message);


        const sponsorId = (await db.collection('users').findOne({ username })).sponsorId;

        // Add payment to the 'payments' collection
        const result = await db.collection('payments').insertOne({ username, date });

        // Make indirect payments
        await processLevelPayments(sponsorId, username,UsersCollection,indirectIncomeCollection);
        res.json({ success: true, payment: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    } finally {
        if (client) {
            // Close the MongoDB connection in the finally block
            client.close();
        }
    }
});

// payment details by the users 
router.get('/payment/:username', async (req, res) => {
  let client;
  try {
      const username = req.params.username;
      // Connect to MongoDB
      client =await connectToMongoDBWithRetry()
      const db = client.db(dbName);
      // Retrieve payments from the 'payments' collection
      const result = await db.collection('payments').find({ username }).toArray();
      res.json({ success: true, payment: result });
  } catch (error) {
    //   console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
      if (client) {
          client.close();
      }
  }
});

//
router.get('/income/:username', async (req, res) => {
  let client;
  try {
      const username = req.params.username;
      // Connect to MongoDB
      client = await connectToMongoDBWithRetry()
      const db = client.db(dbName);
      // Retrieve income from the 'indirectIncomeCollection' collection
      const result = await db.collection('indirectIncomeCollection').find({ username }).toArray();
      res.json({ success: true, payment: result });
  } catch (error) {
    //   console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  } finally {
      if (client) {
          // Close the MongoDB connection in the finally block
          client.close();
      }
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
        // console.error(`Error connecting to MongoDB (Attempt ${currentRetry + 1}/${maxRetries}):`, error);
        currentRetry++;
        restartPM2App("payemntroutes.js")
        // Wait for a certain period before the next retry (e.g., 5 seconds)
        const retryDelay = 5000;
        // console.log(`Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  
    // console.error(`Max retries (${maxRetries}) reached. Unable to establish MongoDB connection.`);
    return null;
  }



  function restartPM2App(url) {
    pm2.connect(function(err) {
        if (err) {
            console.error(err);
            process.exit(2);
        }
        console.log(url);
        pm2.restart('app.js', function(err, apps) {
            pm2.disconnect();
            if (err) {
                console.error(err);
                process.exit(2);
            }
            console.log('App restarted successfully');
        });
    });
  }


  const createEMIMessage = (accountID, name) => {
    return `नमस्ते ${name} जी,

आपको सूचित करते हुए मुझे बड़ी खुशी हो रही है कि हमें आपके खाते में आपके EMI भुगतान प्राप्त हो गया है। आपका त्वरित कार्रवाई के लिए हम आपकी बहुत कृतज्ञता व्यक्त करना चाहते हैं, और मैं इस अवसर पर एक पल बिताना चाहता हूं।

नीचे विवरण दिए गए हैं:
- खाता आईडी: ${accountID}

आपका सहयोग हमें संचालन को सहज रखने में मदद करता है और सुनिश्चित करता है कि आपका खाता अच्छी स्थिति में रहता है।

यदि आपके पास कोई और सवाल या चिंता है, तो कृपया हमें संपर्क करने में संकोच न करें। हम यहां आपकी सहायता के लिए हैं।
एक बार फिर, आपके समय पर भुगतान के लिए धन्यवाद। हम आपके निरंतर समर्थन की मूल्यांकन करते हैं और भविष्य में आपकी सेवा करने के लिए उत्सुक हैं।

शुभकामनाओं के साथ,
विजन कल्याण`;
};
  const makePayment = async (sponsorId, level, amount, username,indirectIncomeCollection) => {
    const now = new Date();
    const options = Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour12: false,
    };
    const levelPaymentData = {
        username: sponsorId,
        date: now.toLocaleString('en-US', options),
        level,
        amount,
        whos: username,
        status: 'unpaid'
    };

    await indirectIncomeCollection.insertOne(levelPaymentData);
};
const processLevelPayments = async (sponsorId, username,UsersCollection,indirectIncomeCollection) => {
    for (let level = 1; level <= 6; level++) {
        if (sponsorId && level <= 5) {
            let totalPayments = await indirectIncomeCollection.find({ username: sponsorId, level, whos: username }).toArray();
            if (totalPayments.length < 15) {
                let amount = level === 1 ? 500 : (level === 2 ? 50 : (level === 3 ? 40 : (level === 4 ? 30 : (level === 5 ? 20 : 10))));
                if (level === 1 && totalPayments.length === 11) {
                    amount *= 5;
                }
                await makePayment(sponsorId, level, amount, username,indirectIncomeCollection);
                sponsorId = (await UsersCollection.findOne({ username: sponsorId })).sponsorId;
            } else {
                break; // No need to proceed further if 15 payments reached for this level
            }
        } else {
            break; // Break if no sponsor or reached the final level
        }
    }
};

module.exports = router;
