# BREVO EMAIL SERVICE SETUP GUIDE
# ================================

## 1. Sign up for Brevo (Free Account)
Visit: https://www.brevo.com/
- Free tier: 300 emails/day
- No credit card required
- Reliable for production hosting

## 2. Get SMTP Credentials
After signup:
1. Go to "SMTP & API" in your Brevo dashboard
2. Click "SMTP" tab
3. Note your credentials:
   - Server: smtp-relay.brevo.com
   - Port: 587
   - Login: your-email@domain.com
   - Password: (your master password or SMTP key)

## 3. Update Environment Variables in Render.com
In your Render.com service dashboard, update these:

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-email@domain.com
SMTP_PASS=your-brevo-password
SMTP_FROM_EMAIL=indiansinghana.cards@gmail.com
SMTP_FROM_NAME=Indians in Ghana

## 4. Alternative: SendGrid (Most Popular)
If you prefer SendGrid:
1. Sign up at https://sendgrid.com/
2. Get API key from dashboard
3. Use these settings:

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM_EMAIL=indiansinghana.cards@gmail.com
SMTP_FROM_NAME=Indians in Ghana

## 5. Alternative: Mailgun
Sign up at https://mailgun.com/
Free tier: 5,000 emails/month for 3 months

SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-smtp-user
SMTP_PASS=your-mailgun-smtp-password
SMTP_FROM_EMAIL=indiansinghana.cards@gmail.com
SMTP_FROM_NAME=Indians in Ghana

## Why This Fixes the Issue:
- Gmail SMTP often blocked by hosting providers
- Professional email services designed for production
- Better deliverability and reliability
- No connection timeout issues
- Proper support for bulk sending