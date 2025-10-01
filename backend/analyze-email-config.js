require('dotenv').config();
const fs = require('fs');

console.log('🔍 Email Configuration Analysis');
console.log('===============================\n');

console.log('📁 Environment Variables:');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
console.log(`SMTP_PORT: ${process.env.SMTP_PORT}`);
console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? process.env.SMTP_PASS.substring(0, 4) + '...' + process.env.SMTP_PASS.slice(-4) : 'NOT SET'}`);
console.log(`SMTP_FROM_EMAIL: ${process.env.SMTP_FROM_EMAIL}`);
console.log(`SMTP_FROM_NAME: ${process.env.SMTP_FROM_NAME}`);
console.log(`DISABLE_SMTP_VERIFY: ${process.env.DISABLE_SMTP_VERIFY}`);

console.log('\n📄 .env File Contents:');
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const smtpLines = envContent.split('\n').filter(line => 
    line.includes('SMTP') || line.includes('EMAIL') || line.includes('DISABLE')
  );
  smtpLines.forEach(line => {
    if (line.includes('SMTP_PASS')) {
      console.log(`${line.split('=')[0]}=${line.split('=')[1] ? line.split('=')[1].substring(0, 4) + '...' + line.split('=')[1].slice(-4) : ''}`);
    } else {
      console.log(line);
    }
  });
} catch (error) {
  console.error('Error reading .env file:', error.message);
}

console.log('\n🔧 Potential Issues:');
console.log('1. Check if SMTP_PASS is a valid Gmail App Password (16 characters)');
console.log('2. Verify 2-Factor Authentication is enabled on the Gmail account');
console.log('3. Check if the account has "Less secure app access" enabled (deprecated)');
console.log('4. Verify the email account is cards@indiansinghana.com');

process.exit(0);