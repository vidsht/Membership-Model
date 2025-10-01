const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 VERIFYING ACTUAL SMTP CREDENTIALS');
console.log('===================================');

console.log('Environment check:');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL);
console.log('SMTP_PASS:', process.env.SMTP_PASS);
console.log('SMTP_PASS length:', process.env.SMTP_PASS?.length);

// Check if the credentials format is correct for Gmail App Password
if (process.env.SMTP_PASS) {
    const pass = process.env.SMTP_PASS;
    console.log('\nGmail App Password Analysis:');
    console.log('Full password:', pass);
    console.log('Length:', pass.length);
    console.log('Format check:', /^[a-z ]{16}$/.test(pass) ? 'Valid App Password format' : 'Invalid format');
    console.log('Has spaces:', pass.includes(' ') ? 'Yes' : 'No');
}

// Check if there are any environment overrides
console.log('\nEnvironment variables check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current working directory:', process.cwd());
console.log('.env file path:', path.join(__dirname, '.env'));

// Try a simple SMTP connection test
console.log('\n🧪 Testing SMTP connection with current credentials...');

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function testSMTPConnection() {
    try {
        console.log('🔄 Attempting SMTP connection...');
        const result = await transporter.verify();
        console.log('✅ SMTP connection successful!', result);
        return true;
    } catch (error) {
        console.log('❌ SMTP connection failed:', error.message);
        console.log('Error code:', error.code);
        
        if (error.code === 'EAUTH') {
            console.log('\n💡 DIAGNOSIS:');
            console.log('This is definitely a Gmail App Password issue.');
            console.log('The credentials in your .env file are invalid.');
            console.log('You need to generate a new Gmail App Password for:', process.env.SMTP_USER);
        }
        return false;
    }
}

testSMTPConnection();