document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('help-btn');
    const donateBtn = document.getElementById('donate-btn');
    const helpModal = document.getElementById('help-modal');
    const donateModal = document.getElementById('donate-modal');
    const closeHelp = document.getElementById('close-help');
    const closeDonate = document.getElementById('close-donate');
    const ratioBtns = document.querySelectorAll('.ratio-btn');
    const container = document.getElementById('canvas-container');
    const asciiOutput = document.getElementById('ascii-output');
    const generateBtn = document.getElementById('generate-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const imageUpload = document.getElementById('image-upload');
    
    if (!localStorage.getItem('asciiStudioVisited')) {
        helpModal.classList.remove('hidden');
        localStorage.setItem('asciiStudioVisited', 'true');
    }

    helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
    donateBtn.addEventListener('click', () => donateModal.classList.remove('hidden'));
    closeHelp.addEventListener('click', () => helpModal.classList.add('hidden'));
    closeDonate.addEventListener('click', () => donateModal.classList.add('hidden'));

    ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ratioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const ratio = btn.dataset.ratio.split(':');
            container.style.aspectRatio = `${ratio[0]}/${ratio[1]}`;
            generatePlaceholder(btn.dataset.ratio);
        });
    });

    uploadBtn.addEventListener('click', () => imageUpload.click());

    imageUpload.addEventListener('change', (e) => {
        if(e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                asciiOutput.innerText = "[ Image Loaded - Renderer Pending Integration ]\n\nFile: " + e.target.files[0].name;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    generateBtn.addEventListener('click', () => {
        const prompt = document.getElementById('prompt-input').value;
        if (prompt) {
            asciiOutput.innerText = `[ Rendering Prompt ]\n\n"${prompt}"\n\nProcessing...`;
            setTimeout(() => {
                generatePlaceholder(document.querySelector('.ratio-btn.active').dataset.ratio);
            }, 500);
        } else {
            generatePlaceholder(document.querySelector('.ratio-btn.active').dataset.ratio);
        }
    });

    function generatePlaceholder(ratio) {
        let cols = 80;
        let rows = 40;
        if (ratio === '1:1') { cols = 60; rows = 30; }
        if (ratio === '9:16') { cols = 40; rows = 50; }
        
        const chars = ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'];
        let output = '';
        for (let i = 0; i < rows; i++) {
            let row = '';
            for (let j = 0; j < cols; j++) {
                const noise = Math.random();
                const charIdx = Math.floor(noise * chars.length);
                row += chars[charIdx];
            }
            output += row + '\n';
        }
        asciiOutput.innerText = output;
    }

    generatePlaceholder('16:9');

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.error('Service Worker registration failed:', err);
        });
    }
});
