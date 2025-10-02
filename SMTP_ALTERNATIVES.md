# Alternative SMTP configurations for better production reliability

# Option 1: SendGrid (Recommended for production)
# Sign up at https://sendgrid.com and get API key
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key_here
SMTP_FROM_EMAIL=indiansinghana.cards@gmail.com
SMTP_FROM_NAME=Indians in Ghana

# Option 2: Mailgun
# Sign up at https://mailgun.com
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your_mailgun_user
SMTP_PASS=your_mailgun_password
SMTP_FROM_EMAIL=indiansinghana.cards@gmail.com
SMTP_FROM_NAME=Indians in Ghana

# Option 3: Amazon SES
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_aws_access_key
SMTP_PASS=your_aws_secret_key
SMTP_FROM_EMAIL=indiansinghana.cards@gmail.com
SMTP_FROM_NAME=Indians in Ghana

# Option 4: Brevo (formerly Sendinblue) - Has free tier
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_brevo_email
SMTP_PASS=your_brevo_password
SMTP_FROM_EMAIL=indiansinghana.cards@gmail.com
SMTP_FROM_NAME=Indians in Ghana

# Current Gmail setup (keep as backup)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=indiansinghana.cards@gmail.com
# SMTP_PASS=qikt snoe gpxs pneb