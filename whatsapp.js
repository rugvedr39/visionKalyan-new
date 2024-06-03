const fs = require('fs');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { MessageMedia } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');

const mongoURL = 'mongodb+srv://kalyanvision381:uykt2riskUeq2LIj@cluster0.9wscwrp.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(mongoURL).then(() => {
    console.log('MongoDB connected successfully!');

    const store = new MongoStore({ mongoose: mongoose });
    initializeClient(store);
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

let client;

function initializeClient(store) {
    client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 300000
        })
    });

    // client.initialize();
    client.on('qr', (qr) => {
        console.log('Scan the QR code:');
        qrcode.generate(qr, { small: true });
    });
    client.on('authenticated', (session) => {
        console.log('AUTHENTICATED');
    });
    client.on('ready', () => {
        console.log('Client is ready!');
    });
}

const SESSION_FILE_PATH = './session.json';
let sessionCfg;

if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

async function sendMessage(number, message) {
    try {
        const chat = await client.getChatById(`${number}@c.us`);
        chat.sendMessage(message);
        console.log('Message sent successfully!');
    } catch (error) {
        console.error('Error occurred while sending message:', error);
    }
}

async function sendFileMessage(number, filePath, caption = '') {
    try {
        const media = MessageMedia.fromFilePath(`./${filePath}`);
        const chat = await client.getChatById(`${number}@c.us`);
        await chat.sendMessage(media, { caption: caption });
        console.log('File sent successfully!');
    } catch (error) {
        console.error('Error occurred while sending file:', error);
    }
}

module.exports = { sendMessage, sendFileMessage };
