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
    // Show intro modal on first visit or via Help button
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

    // ----- AI Initialization (Transformers.js) -----
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

    // ----- Main Generation Action -----
    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        const ratioStr = document.querySelector('.ratio-btn.active').dataset.ratio;

        if (!currentImage && !prompt) {
            alert("Please enter a prompt or upload an image.");
            return;
        }

        // Show Full-Screen Loading Modal immediately
        loadingModal.classList.remove('hidden');
        loadingText.innerText = "Initializing Engine...";
        loadingSubtext.innerText = "Please wait.";
        
        // Yield to browser to paint the modal before heavy sync/async tasks
        await new Promise(r => setTimeout(r, 100));

        try {
            // Setup hidden canvas
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
                // We need the AI model
                const extractor = await getAI();
                
                loadingText.innerText = "Analyzing Prompt...";
                loadingSubtext.innerText = "Extracting semantic vectors";
                await new Promise(r => setTimeout(r, 50));
                
                const output = await extractor(prompt, { pooling: 'mean', normalize: true });
                const vector = Array.from(output.data);
                
                loadingText.innerText = "Rendering Scene...";
                loadingSubtext.innerText = "Generating structural art";
                await new Promise(r => setTimeout(r, 50));

                drawAIProceduralScene(ctx, vector, cols, rows);
                convertCanvasToAscii(ctx, cols, rows);
            }

            // Hide Setup, Show Results
            setupView.classList.add('hidden');
            resultView.classList.remove('hidden');

        } catch (err) {
            console.error(err);
            alert("An error occurred during generation: " + err.message);
        } finally {
            // Guarantee the loading modal goes away
            loadingModal.classList.add('hidden');
        }
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
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, w, h);

        // Normalize vector to guarantee bright/visible shapes (prevents a black screen)
        let maxVal = Math.max(...vector.map(Math.abs));
        if (maxVal === 0) maxVal = 1;
        let nv = vector.map(v => Math.abs(v) / maxVal); // 0.0 to 1.0

        // Background Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, `rgb(${Math.floor(nv[0]*255)}, ${Math.floor(nv[1]*255)}, ${Math.floor(nv[2]*255)})`);
        grad.addColorStop(1, "black");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Draw structural shapes based on the semantic vector
        for(let i = 10; i < 70; i += 5) {
            let cx = nv[i] * w;
            let cy = nv[i+1] * h;
            let size = nv[i+2] * (w * 0.4); 
            let intensity = Math.floor(nv[i+3] * 255);
            let shapeType = Math.floor(nv[i+4] * 3); // 0, 1, or 2

            // High contrast fills
            ctx.fillStyle = `rgba(${intensity}, ${intensity}, ${intensity}, 0.8)`;
            
            ctx.beginPath();
            if (shapeType === 0) {
                // Circle
                ctx.arc(cx, cy, size/2, 0, Math.PI*2);
            } else if (shapeType === 1) {
                // Rectangle
                ctx.rect(cx - size/2, cy - size/2, size, size);
            } else {
                // Triangle
                ctx.moveTo(cx, cy - size/2);
                ctx.lineTo(cx + size/2, cy + size/2);
                ctx.lineTo(cx - size/2, cy + size/2);
                ctx.closePath();
            }
            ctx.fill();
        }
    }

    function convertCanvasToAscii(ctx, cols, rows) {
        const ramp = " .:-=+*#%@"; // 10 levels, dark to light
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
                
                // Boost contrast slightly
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
