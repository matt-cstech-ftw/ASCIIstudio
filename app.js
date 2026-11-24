document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const helpBtn = document.getElementById('help-btn');
    const donateBtn = document.getElementById('donate-btn');
    const helpModal = document.getElementById('help-modal');
    const donateModal = document.getElementById('donate-modal');
    const closeHelp = document.getElementById('close-help');
    const closeDonate = document.getElementById('close-donate');
    const container = document.getElementById('canvas-container');
    const asciiOutput = document.getElementById('ascii-output');
    
    // Inputs
    const promptInput = document.getElementById('prompt-input');
    const ratioBtns = document.querySelectorAll('.ratio-btn');
    const rampSelect = document.getElementById('ramp-select');
    const contrastSlider = document.getElementById('contrast');
    const animSelect = document.getElementById('anim-select');
    const generateBtn = document.getElementById('generate-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const clearImageBtn = document.getElementById('clear-image-btn');
    const imageUpload = document.getElementById('image-upload');
    const exportTextBtn = document.getElementById('export-text');

    let currentImage = null;

    // Modals
    if (!localStorage.getItem('asciiStudioVisited')) {
        helpModal.classList.remove('hidden');
        localStorage.setItem('asciiStudioVisited', 'true');
    }
    helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
    donateBtn.addEventListener('click', () => donateModal.classList.remove('hidden'));
    closeHelp.addEventListener('click', () => helpModal.classList.add('hidden'));
    closeDonate.addEventListener('click', () => donateModal.classList.add('hidden'));

    // Aspect Ratio
    ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ratioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const ratio = btn.dataset.ratio.split(':');
            container.style.aspectRatio = `${ratio[0]}/${ratio[1]}`;
            renderAscii();
        });
    });

    // Inputs & Rendering Triggers
    rampSelect.addEventListener('change', renderAscii);
    contrastSlider.addEventListener('input', renderAscii);
    promptInput.addEventListener('keyup', (e) => {
        if(e.key === 'Enter') renderAscii();
    });
    generateBtn.addEventListener('click', renderAscii);

    animSelect.addEventListener('change', () => {
        asciiOutput.className = '';
        if (animSelect.value === 'scanline') asciiOutput.classList.add('scanline');
        if (animSelect.value === 'flicker') asciiOutput.classList.add('flicker');
    });

    // Image Upload
    uploadBtn.addEventListener('click', () => imageUpload.click());
    clearImageBtn.addEventListener('click', () => {
        currentImage = null;
        imageUpload.value = '';
        uploadBtn.classList.remove('hidden');
        clearImageBtn.classList.add('hidden');
        promptInput.disabled = false;
        renderAscii();
    });

    imageUpload.addEventListener('change', (e) => {
        if(e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    currentImage = img;
                    uploadBtn.classList.add('hidden');
                    clearImageBtn.classList.remove('hidden');
                    promptInput.disabled = true; // Image takes precedence
                    renderAscii();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Export
    exportTextBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(asciiOutput.innerText).then(() => {
            const orig = exportTextBtn.innerText;
            exportTextBtn.innerText = "Copied!";
            setTimeout(() => exportTextBtn.innerText = orig, 2000);
        });
    });

    // ---------------------------------------------------------
    // Core Client-Side Engine: Canvas -> Pixels -> ASCII
    // ---------------------------------------------------------
    function renderAscii() {
        const prompt = promptInput.value.trim();
        const ratio = document.querySelector('.ratio-btn.active').dataset.ratio;
        const rampType = rampSelect.value;
        const contrastVal = parseInt(contrastSlider.value) / 100;

        // 1. Determine Grid Size (compensating for monospace height)
        let cols = 110;
        let rows = 40;
        if (ratio === '1:1') { cols = 80; rows = 40; }
        else if (ratio === '9:16') { cols = 60; rows = 55; }
        else { cols = 120; rows = 35; } // 16:9

        // 2. Setup Hidden Canvas
        const canvas = document.createElement('canvas');
        canvas.width = cols;
        canvas.height = rows;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, cols, rows);

        // 3. Draw Source Material
        if (currentImage) {
            // Scale and center image
            const scale = Math.min(cols / currentImage.width, rows / currentImage.height);
            const w = currentImage.width * scale;
            const h = currentImage.height * scale;
            const x = (cols - w) / 2;
            const y = (rows - h) / 2;
            ctx.drawImage(currentImage, x, y, w, h);
        } else if (prompt) {
            // Procedural Prompt Interpretation (No external API needed)
            drawProceduralScene(ctx, prompt, cols, rows);
        } else {
            // Default Welcome
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `bold ${Math.floor(cols/12)}px sans-serif`;
            ctx.fillText("ASCII", cols/2, rows/2 - 5);
            ctx.font = `300 ${Math.floor(cols/20)}px sans-serif`;
            ctx.fillText("STUDIO", cols/2, rows/2 + 5);
        }

        // 4. Pixel to ASCII Mapping
        const ramps = {
            standard: [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'],
            blocks: [' ', '░', '▒', '▓', '█'],
            binary: [' ', '0', '1'],
            letters: [' ', 'A', 'S', 'C', 'I', 'X', 'O', 'M', 'W']
        };
        const ramp = ramps[rampType] || ramps.standard;
        const imgData = ctx.getImageData(0, 0, cols, rows).data;
        
        let output = '';
        for (let y = 0; y < rows; y++) {
            let rowStr = '';
            for (let x = 0; x < cols; x++) {
                const offset = (y * cols + x) * 4;
                const r = imgData[offset];
                const g = imgData[offset+1];
                const b = imgData[offset+2];
                
                // Luminance
                let brightness = (0.299*r + 0.587*g + 0.114*b);
                
                // Contrast mapping
                brightness = ((brightness / 255 - 0.5) * contrastVal + 0.5) * 255;
                brightness = Math.max(0, Math.min(255, brightness));

                const charIdx = Math.floor((brightness / 255) * (ramp.length - 1));
                rowStr += ramp[charIdx];
            }
            output += rowStr + '\n';
        }

        asciiOutput.innerText = output;
    }

    // Keyword-based procedural drawing
    function drawProceduralScene(ctx, promptStr, w, h) {
        const p = promptStr.toLowerCase();
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        let emoji = "";
        if (p.includes("cat")) emoji = "🐱";
        else if (p.includes("dog")) emoji = "🐶";
        else if (p.includes("skull")) emoji = "💀";
        else if (p.includes("light") || p.includes("house")) emoji = "🗼";
        else if (p.includes("tree") || p.includes("forest")) emoji = "🌲";
        else if (p.includes("car") || p.includes("drive")) emoji = "🚗";
        else if (p.includes("heart")) emoji = "❤️";
        else if (p.includes("star") || p.includes("space")) emoji = "⭐";
        else if (p.includes("moon") || p.includes("night")) emoji = "🌙";
        else if (p.includes("sun") || p.includes("day")) emoji = "☀️";
        else if (p.includes("fire") || p.includes("flame")) emoji = "🔥";
        else if (p.includes("water") || p.includes("rain") || p.includes("storm")) emoji = "🌧️";
        else if (p.includes("alien")) emoji = "👽";
        else if (p.includes("robot") || p.includes("bot")) emoji = "🤖";
        else if (p.includes("music") || p.includes("song")) emoji = "🎵";

        if (emoji) {
            ctx.font = `${Math.min(w, h) * 0.8}px Arial`;
            ctx.fillText(emoji, w/2, h/2 + (h*0.05));
        } else {
            // Abstract geometric fallback
            const radius = Math.min(w, h) * 0.3;
            ctx.beginPath();
            ctx.arc(w/2, h/2, radius, 0, Math.PI*2);
            ctx.fill();
            
            ctx.fillStyle = "black";
            ctx.font = `bold ${Math.min(w,h) * 0.15}px sans-serif`;
            // Draw text clipped inside the shape
            ctx.fillText(promptStr.substring(0, 10), w/2, h/2);
        }
    }

    // Initial render
    renderAscii();
});
