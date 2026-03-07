# VibeHub - Square Payment Setup Guide

## Overview

This guide explains how to set up Square payment links for VibeHub's $1 signup fee and $1 marketplace listing fee.

## Step 1: Create Square Account

1. Go to [squareup.com](https://squareup.com) and sign up
2. Complete business verification (if required)
3. Navigate to your Square Dashboard

## Step 2: Create Payment Links

### For Signup Fee ($1)

1. In Square Dashboard, go to **Payment Links** (or **Link & QR Codes**)
2. Click **Create Payment Link**
3. Configure:
   - **Item Name**: VibeHub Premium Access
   - **Price**: $1.00 USD
   - **Description**: One-time access fee for VibeHub social platform
4. Click **Create**
5. Copy the generated link (e.g., `https://square.link/u/ROZgfUxo`)

### For Marketplace Listing ($1)

1. Create another payment link
2. Configure:
   - **Item Name**: VibeHub Marketplace Listing
   - **Price**: $1.00 USD
   - **Description**: Fee to list items on VibeHub Marketplace
3. Copy the generated link

## Step 3: Update Your Code

In your `index.html` or `env` file, update:

```javascript
// Square payment links
const SQUARE_SIGNUP_LINK = 'https://square.link/u/YOUR_SIGNUP_LINK';
const SQUARE_MARKETPLACE_LINK = 'https://square.link/u/YOUR_MARKETPLACE_LINK';
```

## Step 4: Optional - Set Up Webhook (Advanced)

For production, set up a webhook to verify payments:

1. Create a server endpoint (e.g., `/api/payment-webhook`)
2. Configure Square Webhooks in Dashboard
3. When payment completes, verify and enable user account

### Simple Webhook Logic (Node.js example):

```javascript
app.post('/api/payment-webhook', async (req, res) => {
  const payment = req.body;
  
  if (payment.status === 'COMPLETED') {
    const email = payment.receiptEmail;
    const paymentId = payment.id;
    
    // Update user in database to paid: true
    await updateUserPaymentStatus(email, paymentId);
  }
  
  res.status(200).send('OK');
});
```

## Demo Mode

For development/demo, payments are bypassed. Users can access all features without paying.

To enable demo mode, the code checks:
```javascript
if (localStorage.getItem('vibehub_demo_session')) {
  // Demo mode - skip payment
  currentUser.paid = true;
}
```

## Production Checklist

Before going live:
- [ ] Square account verified
- [ ] Payment links created and tested
- [ ] Links updated in code
- [ ] Terms of Service updated with refund policy
- [ ] Privacy Policy includes payment data handling
- [ ] Help/Support contact info added

## Troubleshooting

### Payment Link Not Working
- Check that links are HTTPS
- Verify link hasn't expired
- Ensure currency is correct

### Payment Not Registering
- Check webhook URL is publicly accessible
- Verify webhook signature
- Check Square dashboard for payment events

### Want to Use Stripe Instead?
The code can be adapted to use Stripe instead:
1. Create Stripe products ($1 signup, $1 listing)
2. Replace Square links with Stripe Checkout URLs
3. Update payment verification logic

---

## Current Setup (Demo)

Currently configured with demo links:
- Signup: `https://square.link/u/ROZgfUxo`
- Marketplace: `https://square.link/u/82tj2UXK`

These are demo links for testing. Replace with your own links for production!
