# ASCII Studio (V14)

A client-side ASCII generator featuring a secure monetization loop using the official PayPal Smart Buttons JS SDK. Updated with full mobile responsiveness and base64 embedded SVGs to prevent path resolution errors on mobile PWAs.

## Deployment to GitHub Pages

1. **Get your PayPal Client ID:**
   You must replace `test` in `index.html` with your live PayPal Client ID for real transactions to process.
   `<script src="https://www.paypal.com/sdk/js?client-id=YOUR_LIVE_CLIENT_ID...`

2. **Push the code:**
   Unzip these files into your local directory.
   ```bash
   git init
   git add .
   git commit -m "Update: Fixed mobile logo pathing by embedding Base64 SVG data natively"
   git branch -M main
   git remote add origin https://github.com/matt-cstech-ftw/ASCIIstudio.git
   git push -u origin main -f
   ```
