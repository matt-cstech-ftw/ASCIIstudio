import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0/dist/transformers.min.js';

// Disable local models since we are running purely in-browser via CDN
env.allowLocalModels = false;

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const setupView = document.getElementById('setup-view');
    const resultView = document.getElementById('result-view');
    const promptInput = document.getElementById('prompt-input');
    const dropZone = document.getElementById('drop-zone');
    const imageUpload = document.getElementById('image-upload');
    const dropContent = document.getElementById('drop-content');
    const ratioBtns = document.querySelectorAll('.ratio-btn');
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const aiStatus = document.getElementById('ai-status');
    const asciiOutput = document.getElementById('ascii-output');
    
    // Export Elements
    const exportText = document.getElementById('export-text');
    const exportPng = document.getElementById('export-png');
    
    // Help Modal
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');

    let currentImage = null;
    let aiPipeline = null;

    // ----- Modals -----
    helpBtn.addEventListener('click', (e) => { e.preventDefault(); helpModal.classList.remove('hidden'); });
    closeHelp.addEventListener('click', () => helpModal.classList.add('hidden'));

    // ----- Aspect Ratio Selection -----
    ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ratioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ----- Drag & Drop Image Handling -----
    dropZone.addEventListener('click', () => imageUpload.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageFile(e.dataTransfer.files[0]);
        }
    });

    imageUpload.addEventListener('change', (e) => {
        if(e.target.files && e.target.files[0]) {
            handleImageFile(e.target.files[0]);
        }
    });

    function handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                dropZone.classList.add('image-preview-active');
                dropContent.innerHTML = `<span class="drop-title">Image Loaded: ${file.name}</span><span class="drop-sub">Click to change</span>`;
                promptInput.value = ''; // Clear prompt if image is uploaded
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

    // ----- AI Initialization (Transformers.js) -----
    async function getAI() {
        if (!aiPipeline) {
            aiStatus.classList.remove('hidden');
            aiStatus.innerText = "Downloading AI Engine weights (first time only, ~22MB)...";
            generateBtn.disabled = true;
            
            // We use a small, highly effective feature-extraction model to convert prompts into semantic mathematical vectors.
            aiPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                progress_callback: (x) => {
                    if (x.status === 'downloading') {
                        aiStatus.innerText = `Downloading AI Weights: ${x.file} (${Math.round(x.progress)}%)`;
                    }
                }
            });
            aiStatus.innerText = "AI Engine Loaded.";
            setTimeout(() => aiStatus.classList.add('hidden'), 2000);
            generateBtn.disabled = false;
        }
        return aiPipeline;
    }

    // ----- Generation Logic -----
    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        const ratioStr = document.querySelector('.ratio-btn.active').dataset.ratio;

        if (!currentImage && !prompt) {
            alert("Please enter a prompt or upload an image.");
            return;
        }

        generateBtn.disabled = true;
        generateBtn.innerText = "PROCESSING...";

        try {
            // Setup hidden canvas
            const canvas = document.getElementById('render-canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            // Grid Math: ASCII chars are ~0.5 aspect ratio (w/h).
            // We adjust row count so the final text block matches the requested ratio.
            const [ratioW, ratioH] = ratioStr.split(':').map(Number);
            const cols = 120; // High resolution ASCII columns
            const rows = Math.round((cols * 0.5 * ratioH) / ratioW);
            
            canvas.width = cols;
            canvas.height = rows;

            if (currentImage) {
                // Route A: Image to ASCII
                renderImageToCanvas(ctx, currentImage, cols, rows);
                convertCanvasToAscii(ctx, cols, rows);
            } else {
                // Route B: AI Text-to-Procedural Scene
                const extractor = await getAI();
                generateBtn.innerText = "AI MAPPING SCENE...";
                
                // Extract semantic vector (384 dimensions)
                const output = await extractor(prompt, { pooling: 'mean', normalize: true });
                const vector = Array.from(output.data);
                
                // Generate scene deterministically from semantic vector
                drawAIProceduralScene(ctx, vector, cols, rows);
                convertCanvasToAscii(ctx, cols, rows);
            }

            // Show result
            setupView.classList.add('hidden');
            resultView.classList.remove('hidden');

        } catch (err) {
            console.error(err);
            alert("An error occurred during generation: " + err.message);
        }

        generateBtn.disabled = false;
        generateBtn.innerText = "GENERATE";
    });

    // ----- Graphics Functions -----
    function renderImageToCanvas(ctx, img, cols, rows) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, cols, rows);
        
        // Scale to fit and center
        const scale = Math.min(cols / img.width, rows / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (cols - w) / 2;
        const y = (rows - h) / 2;
        ctx.drawImage(img, x, y, w, h);
    }

    function drawAIProceduralScene(ctx, vector, w, h) {
        // This function turns a 384-dimensional semantic AI vector into a visual landscape.
        // Because it's deterministic, similar semantic concepts yield similar shapes!
        
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, w, h);

        // Map vector slices to visual attributes
        // slice 0-3: background gradient
        const bg1 = Math.abs(vector[0]) * 255;
        const bg2 = Math.abs(vector[1]) * 255;
        const bg3 = Math.abs(vector[2]) * 255;
        
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, `rgb(${bg1}, ${bg2}, ${bg3})`);
        grad.addColorStop(1, `rgb(0, 0, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // slice 10-30: draw semantic shapes (planets, structures, terrain)
        for(let i = 10; i < 30; i += 4) {
            const vX = Math.abs(vector[i]) * w * 2; // scale up to spread
            const vY = Math.abs(vector[i+1]) * h * 2;
            const size = Math.abs(vector[i+2]) * (Math.min(w,h) / 2);
            const intensity = Math.abs(vector[i+3]) * 255;
            
            ctx.beginPath();
            if (i % 8 === 0) {
                // Circle
                ctx.arc(vX % w, vY % h, size, 0, Math.PI*2);
            } else {
                // Rect
                ctx.rect((vX % w) - size/2, (vY % h) - size/2, size, size);
            }
            ctx.fillStyle = `rgba(${intensity}, ${intensity}, ${intensity}, 0.5)`;
            ctx.fill();
        }

        // Add semantic high-frequency noise field
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.abs(vector[(i/4) % 300]) * 50);
            data[i] = Math.min(255, data[i] + noise);
            data[i+1] = Math.min(255, data[i+1] + noise);
            data[i+2] = Math.min(255, data[i+2] + noise);
        }
        ctx.putImageData(imgData, 0, 0);
    }

    function convertCanvasToAscii(ctx, cols, rows) {
        const ramp = " .:-=+*#%@"; // 10 levels of density, darkest to lightest
        const imgData = ctx.getImageData(0, 0, cols, rows).data;
        
        let output = '';
        for (let y = 0; y < rows; y++) {
            let rowStr = '';
            for (let x = 0; x < cols; x++) {
                const offset = (y * cols + x) * 4;
                const r = imgData[offset];
                const g = imgData[offset+1];
                const b = imgData[offset+2];
                
                // Standard perceived luminance
                let brightness = (0.299*r + 0.587*g + 0.114*b);
                
                // Enhance contrast slightly for better ASCII definition
                brightness = ((brightness / 255 - 0.5) * 1.5 + 0.5) * 255;
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
        // Draw the text onto a canvas to export as PNG
        const rows = asciiOutput.innerText.split('\n');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Monospace dimensions
        const charW = 6;
        const charH = 10;
        
        canvas.width = rows[0].length * charW + 40; // padding
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
