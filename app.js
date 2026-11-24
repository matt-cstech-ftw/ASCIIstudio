import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.0';

// Configure Transformers.js for browser execution
env.allowLocalModels = false;
env.useBrowserCache = true;

document.addEventListener('DOMContentLoaded', () => {
    // Views
    const setupView = document.getElementById('setup-view');
    const resultView = document.getElementById('result-view');
    
    // Inputs
    const promptInput = document.getElementById('prompt-input');
    const dropZone = document.getElementById('drop-zone');
    const imageUpload = document.getElementById('image-upload');
    const dropContent = document.getElementById('drop-content');
    const ratioBtns = document.querySelectorAll('.ratio-btn');
    
    // Actions
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const exportText = document.getElementById('export-text');
    const exportPng = document.getElementById('export-png');
    const asciiOutput = document.getElementById('ascii-output');
    
    // Modals
    const introModal = document.getElementById('intro-modal');
    const helpBtn = document.getElementById('help-btn');
    const closeIntro = document.getElementById('close-intro');
    const loadingModal = document.getElementById('loading-modal');
    const loadingText = document.getElementById('loading-text');
    const loadingSubtext = document.getElementById('loading-subtext');

    let currentImage = null;
    let aiPipeline = null;

    // ----- Modal Controls -----
    if (!localStorage.getItem('asciiStudioWelcome')) {
        introModal.classList.remove('hidden');
    }
    closeIntro.addEventListener('click', () => {
        introModal.classList.add('hidden');
        localStorage.setItem('asciiStudioWelcome', 'true');
    });
    helpBtn.addEventListener('click', (e) => { 
        e.preventDefault(); 
        introModal.classList.remove('hidden'); 
    });

    // ----- Aspect Ratio Selection -----
    ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ratioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ----- Drag & Drop Image Handling -----
    dropZone.addEventListener('click', () => imageUpload.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]);
    });
    imageUpload.addEventListener('change', (e) => {
        if(e.target.files && e.target.files[0]) handleImageFile(e.target.files[0]);
    });

    function handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                dropZone.classList.add('image-preview-active');
                dropContent.innerHTML = `<span class="drop-title">Image Loaded: ${file.name}</span><span class="drop-sub">Click to change</span>`;
                promptInput.value = ''; 
                promptInput.disabled = true;
                promptInput.placeholder = "Image selected. Prompt generation disabled.";
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ----- Reset View -----
    resetBtn.addEventListener('click', () => {
        resultView.classList.add('hidden');
        setupView.classList.remove('hidden');
        currentImage = null;
        imageUpload.value = '';
        dropZone.classList.remove('image-preview-active');
        dropContent.innerHTML = `<span class="drop-title">Click to upload or drag & drop</span><span class="drop-sub">Converts image to digital character art<br>(PNG, JPG up to 10MB)</span>`;
        promptInput.disabled = false;
        promptInput.placeholder = "Describe a scene, object, or feeling to generate procedural ASCII art...";
    });

    // ----- Emoji / Object Mapping (Deterministic Render) -----
    // Because mapping an abstract 384D math vector into perfect geometric shapes often results in 
    // abstract blobs (as seen in the screenshots), we instead use the AI to semantically match 
    // the user's prompt against a library of recognizable core emojis/shapes, which are then rendered clearly.
    const shapeDictionary = [
        { word: "cat", char: "🐱" },
        { word: "dog", char: "🐶" },
        { word: "bird", char: "🦅" },
        { word: "fire", char: "🔥" },
        { word: "flame", char: "🔥" },
        { word: "water", char: "💧" },
        { word: "storm", char: "⚡" },
        { word: "skull", char: "💀" },
        { word: "alien", char: "👽" },
        { word: "robot", char: "🤖" },
        { word: "heart", char: "❤️" },
        { word: "star", char: "⭐" },
        { word: "moon", char: "🌙" },
        { word: "sun", char: "☀️" },
        { word: "tree", char: "🌲" },
        { word: "car", char: "🚗" },
        { word: "house", char: "🏠" },
        { word: "ghost", char: "👻" },
        { word: "sword", char: "🗡️" },
        { word: "flower", char: "🌺" }
    ];

    // ----- AI Initialization -----
    async function getAI() {
        if (!aiPipeline) {
            loadingText.innerText = "Downloading AI Model...";
            loadingSubtext.innerText = "This happens once. About 22MB.";
            
            aiPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                progress_callback: (x) => {
                    if (x.status === 'downloading') {
                        let pct = Math.round((x.loaded / x.total) * 100);
                        if (isNaN(pct) && x.progress) pct = Math.round(x.progress);
                        loadingText.innerText = `Downloading Model (${pct || 0}%)`;
                        loadingSubtext.innerText = `File: ${x.file}`;
                    }
                }
            });
            loadingText.innerText = "AI Engine Loaded";
            loadingSubtext.innerText = "Initializing generation...";
        }
        return aiPipeline;
    }

    // Helper: Compute cosine similarity between two vectors
    function cosineSimilarity(vecA, vecB) {
        let dotProduct = 0, normA = 0, normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // ----- Main Generation Action -----
    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim().toLowerCase();
        const ratioStr = document.querySelector('.ratio-btn.active').dataset.ratio;

        if (!currentImage && !prompt) {
            alert("Please enter a prompt or upload an image.");
            return;
        }

        loadingModal.classList.remove('hidden');
        loadingText.innerText = "Initializing Engine...";
        loadingSubtext.innerText = "Please wait.";
        
        await new Promise(r => setTimeout(r, 100));

        try {
            const canvas = document.getElementById('render-canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            // Grid Math: ASCII chars are ~0.5 aspect ratio (w/h).
            const [ratioW, ratioH] = ratioStr.split(':').map(Number);
            const cols = 120; // High resolution ASCII columns
            const rows = Math.round((cols * 0.5 * ratioH) / ratioW);
            
            canvas.width = cols;
            canvas.height = rows;

            if (currentImage) {
                loadingText.innerText = "Processing Image...";
                loadingSubtext.innerText = "Mapping pixels to characters";
                await new Promise(r => setTimeout(r, 50));
                
                renderImageToCanvas(ctx, currentImage, cols, rows);
                convertCanvasToAscii(ctx, cols, rows);
            } else {
                const extractor = await getAI();
                
                loadingText.innerText = "Analyzing Prompt...";
                loadingSubtext.innerText = "Running semantic matching";
                await new Promise(r => setTimeout(r, 50));
                
                // Get embedding for user prompt
                const promptOutput = await extractor(prompt, { pooling: 'mean', normalize: true });
                const promptVector = Array.from(promptOutput.data);
                
                // Find the best semantic match in our dictionary
                let bestMatch = shapeDictionary[0].char;
                let highestSim = -1;
                
                // Fast naive check first (if user literally typed "cat")
                const exactMatch = shapeDictionary.find(s => prompt.includes(s.word));
                if (exactMatch) {
                    bestMatch = exactMatch.char;
                } else {
                    // Semantic check for abstract concepts
                    for (const item of shapeDictionary) {
                        const itemOutput = await extractor(item.word, { pooling: 'mean', normalize: true });
                        const itemVector = Array.from(itemOutput.data);
                        const sim = cosineSimilarity(promptVector, itemVector);
                        if (sim > highestSim) {
                            highestSim = sim;
                            bestMatch = item.char;
                        }
                    }
                }
                
                loadingText.innerText = "Rendering Scene...";
                loadingSubtext.innerText = "Mapping shape to ASCII";
                await new Promise(r => setTimeout(r, 50));

                drawSemanticShape(ctx, bestMatch, cols, rows);
                convertCanvasToAscii(ctx, cols, rows);
            }

            setupView.classList.add('hidden');
            resultView.classList.remove('hidden');

        } catch (err) {
            console.error(err);
            alert("An error occurred during generation: " + err.message);
        } finally {
            loadingModal.classList.add('hidden');
        }
    });

    // ----- Graphics Functions -----
    function renderImageToCanvas(ctx, img, cols, rows) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, cols, rows);
        const scale = Math.min(cols / img.width, rows / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (cols - w) / 2;
        const y = (rows - h) / 2;
        ctx.drawImage(img, x, y, w, h);
    }

    function drawSemanticShape(ctx, char, w, h) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, w, h);
        
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Draw the matched emoji/character as a massive silhouette
        // This ensures a highly recognizable shape instead of abstract blobs
        const fontSize = Math.min(w, h) * 0.9;
        ctx.font = `${fontSize}px Arial, sans-serif`;
        
        // Slightly offset vertically to account for emoji baseline quirks
        ctx.fillText(char, w/2, h/2 + (h*0.1));
    }

    function convertCanvasToAscii(ctx, cols, rows) {
        // High density character ramp
        const ramp = " .:-=+*#%@";
        const imgData = ctx.getImageData(0, 0, cols, rows).data;
        
        let output = '';
        for (let y = 0; y < rows; y++) {
            let rowStr = '';
            for (let x = 0; x < cols; x++) {
                const offset = (y * cols + x) * 4;
                const r = imgData[offset];
                const g = imgData[offset+1];
                const b = imgData[offset+2];
                
                let brightness = (0.299*r + 0.587*g + 0.114*b);
                
                // Boost contrast drastically to ensure the shape pops
                brightness = ((brightness / 255 - 0.5) * 2.0 + 0.5) * 255;
                brightness = Math.max(0, Math.min(255, brightness));

                const charIdx = Math.floor((brightness / 255) * (ramp.length - 1));
                rowStr += ramp[charIdx];
            }
            output += rowStr + '\n';
        }
        asciiOutput.innerText = output;
    }

    // ----- Exports -----
    exportText.addEventListener('click', () => {
        navigator.clipboard.writeText(asciiOutput.innerText).then(() => {
            const orig = exportText.innerText;
            exportText.innerText = "Copied!";
            setTimeout(() => exportText.innerText = orig, 2000);
        });
    });

    exportPng.addEventListener('click', () => {
        const rows = asciiOutput.innerText.split('\n');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const charW = 6;
        const charH = 10;
        
        canvas.width = rows[0].length * charW + 40; 
        canvas.height = (rows.length - 1) * charH + 40;
        
        ctx.fillStyle = "#0F0F0F";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `${charH}px monospace`;
        ctx.textBaseline = "top";
        
        rows.forEach((row, idx) => {
            ctx.fillText(row, 20, 20 + (idx * charH));
        });
        
        const link = document.createElement('a');
        link.download = 'ascii-studio-render.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});
