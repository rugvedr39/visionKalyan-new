
// paymentRoutes.js

const express = require('express');
const router = express.Router();
const { sendMessage } = require('./whatsapp.js');
const { connectToMongoDB } = require('./db');

router.post('/add', async (req, res) => {
    try {
        const { username, date } = req.body;
        const db = await connectToMongoDB();
        const UsersCollection = db.collection('users');
        const indirectIncomeCollectionName = 'indirectIncomeCollection';
        const indirectIncomeCollection = db.collection(indirectIncomeCollectionName);

        // Check if the username is available
        const existingUser = await db.collection('users').findOne({ username });

        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'Username not found' });
        }
        // const countryCode = '91';
        // const phoneNumberString = String(existingUser.phoneNumber);
        // const formattedNumber = phoneNumberString.startsWith('+') ? `${countryCode}${phoneNumberString.slice(1)}` : `${countryCode}${phoneNumberString}`;
        
        // let message = createEMIMessage(username,existingUser.name).toString();
        // sendMessage(formattedNumber, message);

        // Add payment to the 'payments' collection
        const result = await db.collection('payments').insertOne({ username, date });

        // Make indirect payments
        // await processLevelPayments(sponsorId, username,UsersCollection,indirectIncomeCollection);

        const paymentRecord = await collection.findOne({ EmiAmount: existingUser.EmiAmount });

        if (!paymentRecord) {
          return res.status(400).json({ error: "Invalid EMI Amount selected." });
      }

      const countPayment = await db.collection('indirectIncomeCollection').countDocuments({ username,level: 1,amount:existingUser.EmiAmount });

        if (countPayment <= paymentRecord.times) {
            let levelPaymentData = {
                username: existingUser.sponsorId,
                date: now.toLocaleString('en-US', options),
                level: 1,
                amount: paymentRecord.sposerAmount, 
                whos: existingUser.username,
                status: 'unpaid'
            };
        
            await db.collection('indirectIncomeCollection').insertOne(levelPaymentData);
        }
        res.json({ success: true, payment: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// payment details by the users 
router.get('/payment/:username', async (req, res) => {
  let client;
  try {
      const username = req.params.username;
      const db = await connectToMongoDB();
      // Retrieve payments from the 'payments' collection
      const result = await db.collection('payments').find({ username }).toArray();
      res.json({ success: true, payment: result });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  } 
});

//
router.get('/income/:username', async (req, res) => {
  try {
      const username = req.params.username;
      const db = await connectToMongoDB();
      const result = await db.collection('indirectIncomeCollection').find({ username }).toArray();
      res.json({ success: true, payment: result });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

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
                break;
            }
        } else {
            break;
        }
    }
};

module.exports = router;
