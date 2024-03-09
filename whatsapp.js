// sendMessage.js
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');

const SESSION_FILE_PATH = './session.json';

let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

(async () => {
    const browser = await puppeteer.launch({ headless: true });

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: "client-one"
        }),
        puppeteer: {
            browserWSEndpoint: await browser.wsEndpoint()
        },
        session: sessionCfg
    });

    client.on('qr', (qr) => {
        // Display the QR code in the terminal
        console.log('Scan the QR code:');
        qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', (session) => {
        console.log('AUTHENTICATED', session);
    });

    client.on('ready', () => {
        console.log('Client is ready!');
    });

    client.initialize();

    async function sendMessage(number, message) {
        try {
            const chat = await client.getChatById(`${number}@c.us`);
            chat.sendMessage(message);
            console.log('Message sent successfully!');
        } catch (error) {
            console.error('Error occurred while sending message:', error);
        }
    }

    module.exports = { sendMessage };
})();
