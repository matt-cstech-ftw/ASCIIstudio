document.addEventListener('DOMContentLoaded', () => {
    const setupView = document.getElementById('setup-view');
    const resultView = document.getElementById('result-view');
    const promptInput = document.getElementById('prompt-input');
    const dropZone = document.getElementById('drop-zone');
    const imageUpload = document.getElementById('image-upload');
    const dropContent = document.getElementById('drop-content');
    const ratioBtns = document.querySelectorAll('.ratio-btn');
    const colorBtns = document.querySelectorAll('.color-btn');
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const exportPng = document.getElementById('export-png');
    const removeWatermarkBtn = document.getElementById('remove-watermark-btn');
    const asciiOutputContainer = document.getElementById('ascii-output-container');
    
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
    let isProUser = false; 
    let activeWatermarkElement = null; // Store reference to DOM overlay

    // Global variables for re-render state
    let globalCols, globalRows, globalColorMode;

    if (localStorage.getItem('asciiStudioPro') === 'true') {
        isProUser = true;
        removeWatermarkBtn.classList.add('hidden');
    }

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
    
    supportBtn.addEventListener('click', () => donateModal.classList.remove('hidden'));
    removeWatermarkBtn.addEventListener('click', () => donateModal.classList.remove('hidden'));
    closeDonate.addEventListener('click', () => donateModal.classList.add('hidden'));

    // ----- PayPal Smart Buttons Initialization -----
    if (window.paypal) {
        paypal.Buttons({
            style: {
                layout: 'vertical',
                color:  'gold',
                shape:  'pill',
                label:  'donate'
            },
            createOrder: function(data, actions) {
                return actions.order.create({
                    purchase_units: [{
                        amount: { value: '3.00' },
                        description: 'ASCII Studio Watermark Removal'
                    }]
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                    isProUser = true;
                    localStorage.setItem('asciiStudioPro', 'true');
                    removeWatermarkBtn.classList.add('hidden');
                    donateModal.classList.add('hidden');
                    
                    alert('Thank you for supporting ASCII Studio! The watermark has been removed permanently.');
                    
                    // Immediately remove watermark from UI if viewing a result
                    if (!resultView.classList.contains('hidden') && activeWatermarkElement) {
                        activeWatermarkElement.remove();
                        activeWatermarkElement = null;
                    }
                });
            }
        }).render('#paypal-button-container');
    }

    ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ratioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

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

    resetBtn.addEventListener('click', () => {
        resultView.classList.add('hidden');
        setupView.classList.remove('hidden');
        currentImage = null;
        imageUpload.value = '';
        dropZone.classList.remove('image-preview-active');
        dropContent.innerHTML = `<span class="drop-title">Click to upload or drag & drop</span><span class="drop-sub">Converts image to digital character art<br>(PNG, JPG up to 10MB)</span>`;
        promptInput.disabled = false;
        promptInput.placeholder = "Describe a complex scene, object, or concept (e.g., 'a cute house')...";
        asciiOutputContainer.innerHTML = ''; 
        if (activeWatermarkElement) {
            activeWatermarkElement.remove();
            activeWatermarkElement = null;
        }
    });

    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        const ratioStr = document.querySelector('.ratio-btn.active').dataset.ratio;
        const colorMode = document.querySelector('.color-btn.active').dataset.color;
        
        globalColorMode = colorMode;

        if (!currentImage && !prompt) {
            alert("Please enter a prompt or upload an image.");
            return;
        }

        loadingModal.classList.remove('hidden');
        await new Promise(r => setTimeout(r, 100));

        try {
            const canvas = document.getElementById('render-canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            const cols = 150; 
            const [ratioW, ratioH] = ratioStr.split(':').map(Number);
            const rows = Math.round((cols * 0.5 * ratioH) / ratioW);
            
            globalCols = cols;
            globalRows = rows;
            
            canvas.width = cols;
            canvas.height = rows;

            if (currentImage) {
                loadingText.innerText = "Processing Image...";
                loadingSubtext.innerText = "Mapping pixels to characters";
                await new Promise(r => setTimeout(r, 50));
                
                renderImageToCanvas(ctx, currentImage, cols, rows);
                
                convertCanvasToAscii(ctx, cols, rows, colorMode); 
            } else {
                loadingText.innerText = "Generating AI Scene...";
                loadingSubtext.innerText = "Visualizing prompt (this may take a moment)";
                
                let enhancedPrompt = prompt + ", highly detailed";
                const seed = Math.floor(Math.random() * 10000000);
                const targetW = cols * 8;
                const targetH = rows * 8;
                
                const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${targetW}&height=${targetH}&seed=${seed}`;
                
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = () => {
                        renderImageToCanvas(ctx, img, cols, rows);
                        resolve();
                    };
                    img.onerror = () => reject(new Error("Failed to generate AI image. Please try again."));
                    img.src = imgUrl;
                });
                
                // Scrub the native Pollinations AI watermark explicitly before mapping
                // This removes the blurry AI watermark from being rendered into ASCII
                const markSizeW = Math.floor(cols * 0.2); 
                const markSizeH = Math.floor(rows * 0.15); 
                ctx.fillStyle = "black";
                ctx.fillRect(cols - markSizeW, rows - markSizeH, markSizeW, markSizeH);

                convertCanvasToAscii(ctx, cols, rows, colorMode);
                
                // If not a Pro user and it's an AI generation, apply our HTML watermark overlay
                if (!isProUser) {
                    addHtmlWatermark();
                }
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

    function convertCanvasToAscii(ctx, cols, rows, colorMode) {
        const ramp = " .:-=+*#%@";
        const imgData = ctx.getImageData(0, 0, cols, rows).data;
        let htmlOutput = "";
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const offset = (y * cols + x) * 4;
                const r = imgData[offset];
                const g = imgData[offset+1];
                const b = imgData[offset+2];
                
                let brightness = (0.299*r + 0.587*g + 0.114*b);
                brightness = ((brightness / 255 - 0.5) * 1.2 + 0.5) * 255;
                brightness = Math.max(0, Math.min(255, brightness));

                const charIdx = Math.floor((brightness / 255) * (ramp.length - 1));
                const char = ramp[charIdx];
                const displayChar = (char === ' ') ? '&nbsp;' : char;

                if (colorMode === "color") {
                    htmlOutput += `<span style="color: rgb(${r},${g},${b});">${displayChar}</span>`;
                } else {
                    htmlOutput += `<span style="color: #FFFFFF;">${displayChar}</span>`;
                }
            }
            htmlOutput += '<br>';
        }
        asciiOutputContainer.innerHTML = htmlOutput;
    }

    function addHtmlWatermark() {
        if (activeWatermarkElement) activeWatermarkElement.remove();
        
        const wm = document.createElement('div');
        wm.className = 'watermark-overlay';
        wm.innerHTML = `
            <img src="assets/logo.svg" alt="AS Logo">
            <div class="wm-text">ASCII<span>STUDIO</span></div>
        `;
        asciiOutputContainer.appendChild(wm);
        activeWatermarkElement = wm;
    }

    exportPng.addEventListener('click', () => {
        const charW = 6;
        const charH = 10;
        
        const lines = asciiOutputContainer.innerHTML.split('<br>');
        if (lines[lines.length - 1] === '') lines.pop();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Remove the watermark overlay HTML block from the lines array so we don't try to render it as text
        if (lines[lines.length - 1].includes('watermark-overlay')) {
            lines.pop();
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = lines[0];
        const cols = tempDiv.childNodes.length;
        const rows = lines.length;
        
        canvas.width = cols * charW + 40; 
        canvas.height = rows * charH + 40;
        
        ctx.fillStyle = "#0F0F0F";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = `${charH}px monospace`;
        ctx.textBaseline = "top";
        
        lines.forEach((lineHtml, rowIdx) => {
            tempDiv.innerHTML = lineHtml;
            Array.from(tempDiv.childNodes).forEach((span, colIdx) => {
                ctx.fillStyle = span.style.color || "#FFFFFF";
                let char = span.innerText || span.textContent;
                if (char.length > 1 && char.charCodeAt(0) === 160) char = " ";
                ctx.fillText(char, 20 + (colIdx * charW), 20 + (rowIdx * charH));
            });
        });
        
        // If they are not pro, draw the watermark onto the PNG export as well
        if (!isProUser) {
            const asLogo = new Image();
            asLogo.onload = () => {
                const wmWidth = 140;
                const wmHeight = 40;
                ctx.fillStyle = "black";
                ctx.fillRect(canvas.width - wmWidth - 20, canvas.height - wmHeight - 20, wmWidth, wmHeight);
                ctx.drawImage(asLogo, canvas.width - wmWidth - 10, canvas.height - wmHeight - 12, 24, 24);
                
                ctx.fillStyle = "white";
                ctx.font = "800 16px sans-serif";
                ctx.fillText("ASCII", canvas.width - wmWidth + 18, canvas.height - wmHeight - 8);
                
                ctx.fillStyle = "white";
                ctx.font = "300 16px sans-serif";
                ctx.fillText("STUDIO", canvas.width - wmWidth + 64, canvas.height - wmHeight - 8);
                
                triggerDownload(canvas);
            };
            asLogo.src = 'assets/logo.svg';
        } else {
            triggerDownload(canvas);
        }
    });

    function triggerDownload(canvas) {
        const link = document.createElement('a');
        link.download = 'ascii-studio-render.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
});
