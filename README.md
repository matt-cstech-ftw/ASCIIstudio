# ASCII Studio (V3)

A completely client-side PWA featuring a real Hugging Face AI pipeline (`Transformers.js`) running entirely in your browser. 

* **No API Keys, No Server:** Downloads model weights (once) directly into the browser cache.
* **Semantic AI Text-to-Procedural:** Uses `Xenova/all-MiniLM-L6-v2` to map prompts into 384-dimensional semantic vectors, driving a deterministic generative art canvas.
* **Flawless Aspect Ratios:** Mathematically compensates for monospace font stretching.

## Deployment to GitHub Pages

1. **Push the code:**
   Unzip these files into your local directory.
   ```bash
   git init
   git add .
   git commit -m "Update: Exact UI recreation and real Transformers.js AI integration"
   git branch -M main
   git remote add origin https://github.com/matt-cstech-ftw/ASCIIstudio.git
   git push -u origin main -f
   ```

2. **Access your App:**
   Wait a minute or two, and your PWA will be live at:
   `https://matt-cstech-ftw.github.io/ASCIIstudio/`
