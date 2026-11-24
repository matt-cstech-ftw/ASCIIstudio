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
    const donateModal = document.getElementById('donate-modal');
    const helpBtn = document.getElementById('help-btn');
    const supportBtn = document.getElementById('support-btn');
    const closeIntro = document.getElementById('close-intro');
    const closeDonate = document.getElementById('close-donate');
    
    const loadingModal = document.getElementById('loading-modal');
    const loadingText = document.getElementById('loading-text');
    const loadingSubtext = document.getElementById('loading-subtext');

    let currentImage = null;

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
    
    supportBtn.addEventListener('click', () => {
        donateModal.classList.remove('hidden');
    });
    closeDonate.addEventListener('click', () => {
        donateModal.classList.add('hidden');
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
        promptInput.placeholder = "Describe a complex scene, object, or concept (e.g., 'a truck hauling a christmas tree')...";
    });

    // ----- Main Generation Action -----
    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        const ratioStr = document.querySelector('.ratio-btn.active').dataset.ratio;

        if (!currentImage && !prompt) {
            alert("Please enter a prompt or upload an image.");
            return;
        }

        loadingModal.classList.remove('hidden');
        
        await new Promise(r => setTimeout(r, 100));

        try {
            const canvas = document.getElementById('render-canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            // We increase column count slightly to allow more detail for complex images
            const cols = 140; 
            const [ratioW, ratioH] = ratioStr.split(':').map(Number);
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
                loadingText.innerText = "Generating AI Scene...";
                loadingSubtext.innerText = "Visualizing prompt (this may take a moment)";
                
                // Fetch AI Image from Pollinations
                // We append styling text so the AI produces an image that converts well to ASCII
                const enhancedPrompt = prompt + ", graphic novel style, high contrast, clean shapes, black and white";
                const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${cols*8}&height=${rows*8}&nologo=true`;
                
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous"; // Required to read pixels back from the canvas
                    img.onload = () => {
                        renderImageToCanvas(ctx, img, cols, rows);
                        resolve();
                    };
                    img.onerror = () => reject(new Error("Failed to generate AI image. Please try again."));
                    img.src = imgUrl;
                });
                
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
        
        // Scale to fit completely
        const scale = Math.min(cols / img.width, rows / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (cols - w) / 2;
        const y = (rows - h) / 2;
        ctx.drawImage(img, x, y, w, h);
    }

    function convertCanvasToAscii(ctx, cols, rows) {
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
                
                // Enhance contrast to make details pop
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
