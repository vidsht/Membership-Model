# Basic SMTP Solutions Compatible with Render.com

## The Problem with Gmail SMTP on Render.com
- Many hosting providers (including Render.com) block Gmail SMTP
- Port 587 may be restricted or throttled
- Gmail has strict authentication requirements

## Alternative Basic SMTP Options (No Third-Party Services)

### Option 1: Use Different Gmail SMTP Ports
Try these Gmail configurations:

```env
# Gmail SMTP - Port 465 (SSL)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=indiansinghana.cards@gmail.com
SMTP_PASS=qikt snoe gpxs pneb

# Gmail SMTP - Port 25 (if available)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=25
SMTP_SECURE=false
SMTP_USER=indiansinghana.cards@gmail.com
SMTP_PASS=qikt snoe gpxs pneb
```

### Option 2: Use Your Domain's SMTP
If you have email hosting with your domain provider:

```env
SMTP_HOST=mail.indiansinghana.com
SMTP_PORT=587
SMTP_USER=cards@indiansinghana.com
SMTP_PASS=your-domain-email-password
```

### Option 3: Use Yahoo SMTP (Alternative Free Service)
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-yahoo-email@yahoo.com
SMTP_PASS=your-yahoo-app-password
```

### Option 4: Use Outlook/Hotmail SMTP
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-outlook-password
```

## Implementation Notes:
- The system will automatically try different ports/configurations
- Fallback to queue system if all SMTP options fail
- No additional services or APIs required
- Uses standard SMTP protocol only