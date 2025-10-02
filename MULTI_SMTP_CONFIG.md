# Multiple SMTP Configuration for Render.com Compatibility

## Add these environment variables to your Render.com service:

# Primary Gmail SMTP (Current)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=indiansinghana.cards@gmail.com
SMTP_PASS=qikt snoe gpxs pneb
SMTP_FROM_EMAIL=indiansinghana.cards@gmail.com
SMTP_FROM_NAME=Indians in Ghana

# Alternative configurations (system will try these automatically)
# The system will test port 587, then 465, then 25 for Gmail

# If you have domain email, you can also set:
# SMTP_FALLBACK_HOST=mail.indiansinghana.com
# SMTP_FALLBACK_PORT=587
# SMTP_FALLBACK_USER=cards@indiansinghana.com
# SMTP_FALLBACK_PASS=your-domain-email-password

## How it works:
1. System tries Gmail SMTP on port 587 (current setup)
2. If that fails, automatically tries Gmail on port 465 (SSL)
3. If that fails, tries Gmail on port 25
4. If all fail, emails are queued for later delivery
5. Queue processes every 5 minutes and retries

## Benefits:
- No third-party services required
- Automatic fallback between different SMTP ports
- Works with basic SMTP protocol only
- Compatible with Render.com hosting restrictions
- Maintains email delivery even if one port is blocked