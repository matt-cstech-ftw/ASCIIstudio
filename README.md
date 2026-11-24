# ASCII Studio

A purely client-side PWA for generating ASCII art, digital-style filters, and looping animations. Zero backend, zero server costs. 

## Deployment to GitHub Pages

1. **Initialize your repository:**
   If you haven't already, create the repository `ASCIIstudio` on your GitHub account (`matt-cstech-ftw`).

2. **Push the code:**
   Unzip these files into your local directory.
   ```bash
   git init
   git add .
   git commit -m "Update: Added real client-side canvas rendering engine"
   git branch -M main
   git remote add origin https://github.com/matt-cstech-ftw/ASCIIstudio.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to your repository on GitHub.
   - Click **Settings** > **Pages**.
   - Under **Build and deployment**, select **Deploy from a branch**.
   - Select the `main` branch and the `/ (root)` folder.
   - Click **Save**.

4. **Access your App:**
   Wait a minute or two, and your PWA will be live at:
   `https://matt-cstech-ftw.github.io/ASCIIstudio/`
