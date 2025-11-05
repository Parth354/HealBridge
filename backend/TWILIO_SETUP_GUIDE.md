# 📱 Twilio SMS Setup Guide for HealBridge

This guide will help you set up Twilio for sending OTP SMS in your HealBridge application.

---

## 🎯 Overview

HealBridge uses **Twilio** to send OTP (One-Time Password) via SMS for user authentication. The system has built-in fallbacks:
- ✅ **Production**: Sends real SMS via Twilio
- ⚠️ **Development**: Falls back to console logging if Twilio is not configured
- 🔄 **Fallback**: Logs to console if SMS delivery fails

---

## 📋 Prerequisites

- A Twilio account (free trial available)
- A phone number to receive test SMS
- Access to your `.env` file

---

## 🚀 Step-by-Step Setup

### **Step 1: Create a Twilio Account**

1. Go to [Twilio Sign Up](https://www.twilio.com/try-twilio)
2. Sign up with your email
3. Verify your email address
4. Verify your phone number (this will be used for testing)

### **Step 2: Get Your Twilio Credentials**

After signing up, you'll be redirected to the Twilio Console:

1. **Account SID**: 
   - Found on your [Twilio Console Dashboard](https://console.twilio.com/)
   - Looks like: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. **Auth Token**:
   - Click "Show" next to "Auth Token" on the dashboard
   - Looks like: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ **Keep this secret!** Never commit it to Git

### **Step 3: Get a Twilio Phone Number**

1. In the Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Select your country (e.g., India, USA)
3. Choose a number with **SMS capabilities**
4. Click **Buy** (Free trial accounts get $15 credit)
5. Your number will look like: `+1234567890` (with country code)

### **Step 4: Add Credentials to `.env` File**

Open your `.env` file in the `backend` folder and add:

```env
# Twilio SMS Configuration (for OTP)
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-auth-token-here"
TWILIO_PHONE_NUMBER="+1234567890"
```

**Important Notes:**
- ✅ Use your actual Twilio Account SID (starts with `AC`)
- ✅ Use your actual Auth Token (keep it secret!)
- ✅ Use the phone number you bought (include `+` and country code)
- ✅ Wrap values in quotes to avoid parsing issues

### **Step 5: Verify Phone Numbers (Free Trial)**

⚠️ **Free Trial Limitation**: Twilio free trial accounts can **only send SMS to verified phone numbers**.

To verify a phone number:
1. Go to [Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
2. Click **Add a new Caller ID**
3. Enter the phone number you want to test with
4. Complete the verification process

**To send SMS to ANY number**, you need to:
- Upgrade your Twilio account (add credit card)
- Or use the verified numbers during development

### **Step 6: Restart Your Server**

```powershell
cd C:\Users\negis\OneDrive\Desktop\Assignment\Veersa\HealBridge\backend

# Stop current server (if running)
# Press Ctrl+C in the terminal

# Start the server
npm run dev
```

You should see:
```
✅ Twilio SMS client initialized
```

---

## 🧪 Testing

### **Test 1: Send OTP**

```powershell
# Using PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/otp" -Method POST -ContentType "application/json" -Body '{"phone":"+919876543210"}'
```

Or use **Postman**:
```
POST http://localhost:3000/api/auth/otp
Content-Type: application/json

{
  "phone": "+919876543210"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully via SMS",
  "sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

You should receive an SMS with the OTP!

### **Test 2: Verify OTP**

```
POST http://localhost:3000/api/auth/verify
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456"
}
```

---

## 📊 Behavior Matrix

| Scenario | Twilio Configured | Redis Available | Behavior |
|----------|-------------------|-----------------|----------|
| **Production** | ✅ Yes | ✅ Yes | ✅ Sends real SMS |
| **Dev Mode** | ❌ No | ✅ Yes | 📱 Logs OTP to console |
| **SMS Fails** | ✅ Yes | ✅ Yes | ⚠️ Logs to console (fallback) |
| **No Redis** | ✅ Yes | ❌ No | ❌ Error: Cannot store OTP |

---

## ⚠️ Common Issues

### **Issue 1: "Twilio credentials not found"**

**Solution:**
- Check your `.env` file has all three variables
- Restart the server after adding credentials
- Make sure there are no typos in variable names

### **Issue 2: "The number is unverified" (Free Trial)**

**Solution:**
- Verify the destination phone number in [Twilio Console](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
- Or upgrade your Twilio account

### **Issue 3: "Invalid phone number format"**

**Solution:**
- Phone numbers **must** include country code: `+919876543210`
- No spaces, dashes, or parentheses
- Format: `+<country_code><number>`

### **Issue 4: SMS not delivered**

**Check:**
1. Phone number is verified (free trial)
2. Twilio account has sufficient credit
3. Check [Twilio Logs](https://console.twilio.com/us1/monitor/logs/sms) for errors
4. Ensure `TWILIO_PHONE_NUMBER` matches your bought number

---

## 💰 Pricing

### **Free Trial**
- $15 USD credit
- Can only send to verified numbers
- Perfect for development

### **Pay-as-you-go** (after upgrade)
- India: ~₹0.50 per SMS
- USA: ~$0.0079 per SMS
- See [Twilio Pricing](https://www.twilio.com/sms/pricing)

---

## 🔒 Security Best Practices

1. ✅ **Never commit** `.env` file to Git
2. ✅ Add `.env` to `.gitignore`
3. ✅ Use environment variables in production
4. ✅ Rotate Auth Token periodically
5. ✅ Enable two-factor authentication on Twilio account
6. ✅ Set up IP whitelisting in Twilio console (production)

---

## 📚 Additional Resources

- [Twilio Node.js Quickstart](https://www.twilio.com/docs/sms/quickstart/node)
- [Twilio SMS API Reference](https://www.twilio.com/docs/sms/api)
- [Twilio Console](https://console.twilio.com/)
- [Twilio Status Page](https://status.twilio.com/)

---

## 🆘 Need Help?

1. Check [Twilio Logs](https://console.twilio.com/us1/monitor/logs/sms)
2. Review your server console for error messages
3. Verify Redis is running: `wsl -e bash -c "redis-cli ping"`
4. Check `.env` file has correct format

---

## ✅ Checklist

Before deploying to production:

- [ ] Twilio account created
- [ ] Phone number purchased
- [ ] Credentials added to `.env`
- [ ] `.env` added to `.gitignore`
- [ ] Tested OTP sending and verification
- [ ] Redis is running and connected
- [ ] Upgraded Twilio account (or verified test numbers)
- [ ] Monitoring set up for SMS delivery

---

**Your HealBridge backend is now ready to send real OTP SMS! 🎉**

