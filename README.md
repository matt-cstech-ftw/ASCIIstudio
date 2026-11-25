# ASCII Studio (V12)

A client-side ASCII generator featuring a secure monetization loop using the official PayPal Smart Buttons JS SDK. Replaces native AI watermarks with a clean HTML/CSS overlay watermark and unlocks a clean render upon donation.

## Deployment to GitHub Pages

1. **Get your PayPal Client ID:**
   You must replace `test` in `index.html` with your live PayPal Client ID for real transactions to process.
   `<script src="https://www.paypal.com/sdk/js?client-id=YOUR_LIVE_CLIENT_ID...`

2. **Push the code:**
   Unzip these files into your local directory.
   ```bash
   git init
   git add .
   git commit -m "Update: Refined watermark overlay and PNG export rendering"
   git branch -M main
   git remote add origin https://github.com/matt-cstech-ftw/ASCIIstudio.git
   git push -u origin main -f
   ```
