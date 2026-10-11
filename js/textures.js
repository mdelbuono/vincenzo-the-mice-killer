// --- Procedural Canvas Textures ---
function createNameTagTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(20, 24, 32, 0.88)';
    ctx.strokeStyle = '#ffd32a';
    ctx.lineWidth = 5;

    const x = 6, y = 6, w = 288, h = 68, r = 26;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐾 Vincenzo', 150, 40);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function createCatchPromptTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 76;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(235, 77, 75, 0.95)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;

    const x = 6, y = 6, w = 244, h = 64, r = 24;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('[SPACE] CATCH!', 128, 38);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// 1. Living Room Parquet Floor
function createParquetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#b37d4e';
    ctx.fillRect(0, 0, 512, 512);

    const plankHeight = 64;
    const plankWidth = 256;
    const plankShades = ['#9e6c3f', '#b98352', '#a87445', '#c28c5a', '#8d5e35'];

    for (let y = 0; y < 512; y += plankHeight) {
        const rowShift = (y / plankHeight) % 2 === 0 ? 0 : 128;
        for (let x = -128; x < 512; x += plankWidth) {
            const px = x + rowShift;
            const shade = plankShades[Math.floor(Math.random() * plankShades.length)];
            ctx.fillStyle = shade;
            ctx.fillRect(px + 2, y + 2, plankWidth - 4, plankHeight - 4);

            ctx.strokeStyle = 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 1;
            for (let g = 0; g < 4; g++) {
                const gy = y + 8 + Math.random() * (plankHeight - 16);
                ctx.beginPath();
                ctx.moveTo(px + 4, gy);
                ctx.bezierCurveTo(px + 80, gy + (Math.random() - 0.5) * 6, px + 180, gy + (Math.random() - 0.5) * 6, px + plankWidth - 4, gy);
                ctx.stroke();
            }
        }
    }

    ctx.strokeStyle = '#5a3d23';
    ctx.lineWidth = 2;
    for (let y = 0; y <= 512; y += plankHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 3);
    return texture;
}

// 2. Attic Dusty Rustic Wood Plank Floor
function createAtticFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark aged rustic wood
    ctx.fillStyle = '#4a3b32';
    ctx.fillRect(0, 0, 512, 512);

    const plankHeight = 85;
    for (let y = 0; y < 512; y += plankHeight) {
        ctx.fillStyle = y % 2 === 0 ? '#544339' : '#3f322b';
        ctx.fillRect(0, y + 2, 512, plankHeight - 4);

        // Wood grain and rough scratches
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(0, y + 10 + i * 12);
            ctx.lineTo(512, y + 10 + i * 12 + (Math.random() - 0.5) * 10);
            ctx.stroke();
        }

        // Nails
        ctx.fillStyle = '#1e1612';
        ctx.beginPath();
        ctx.arc(30, y + 20, 3, 0, Math.PI * 2);
        ctx.arc(480, y + 20, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Dust motes
    for (let i = 0; i < 2000; i++) {
        ctx.fillStyle = 'rgba(210, 200, 185, 0.08)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    return texture;
}

// 3. Basement Stone Flagstone Floor
function createBasementFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark damp stone grey
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);

    // Flagstone pavers
    const cols = 4;
    const rows = 4;
    const cellW = 512 / cols;
    const cellH = 512 / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const shade = 35 + Math.floor(Math.random() * 20);
            ctx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 5})`;
            ctx.fillRect(c * cellW + 4, r * cellH + 4, cellW - 8, cellH - 8);

            // Dampness specks
            for (let s = 0; s < 40; s++) {
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillRect(c * cellW + Math.random() * cellW, r * cellH + Math.random() * cellH, 3, 3);
            }
        }
    }

    // Mortar lines
    ctx.strokeStyle = '#15171a';
    ctx.lineWidth = 6;
    for (let i = 0; i <= 512; i += cellW) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    return texture;
}

// 4. Basement Brick Wall Texture
function createBasementWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2f3542';
    ctx.fillRect(0, 0, 512, 512);

    const bH = 32;
    const bW = 64;
    for (let y = 0; y < 512; y += bH) {
        const shift = (y / bH) % 2 === 0 ? 0 : 32;
        for (let x = -32; x < 512; x += bW) {
            const redShade = 90 + Math.floor(Math.random() * 40);
            ctx.fillStyle = `rgb(${redShade}, 45, 40)`;
            ctx.fillRect(x + shift + 2, y + 2, bW - 4, bH - 4);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    return texture;
}

function createRugTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#9b3b3a';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#e6b15c';
    ctx.lineWidth = 16;
    ctx.strokeRect(16, 16, 480, 480);

    ctx.strokeStyle = '#324a5f';
    ctx.lineWidth = 8;
    ctx.strokeRect(32, 32, 448, 448);

    ctx.fillStyle = '#e6b15c';
    ctx.beginPath();
    ctx.arc(256, 256, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#324a5f';
    ctx.beginPath();
    ctx.arc(256, 256, 75, 0, Math.PI * 2);
    ctx.fill();

    const corners = [[60, 60], [452, 60], [60, 452], [452, 452]];
    corners.forEach(([cx, cy]) => {
        ctx.fillStyle = '#e6b15c';
        ctx.beginPath();
        ctx.arc(cx, cy, 35, 0, Math.PI * 2);
        ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function createTVCanvasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    let fishX = 40;
    let fishY = 80;
    let fishSpeed = 1.2;

    function updateScreen() {
        const grad = ctx.createLinearGradient(0, 0, 0, 160);
        grad.addColorStop(0, '#0984e3');
        grad.addColorStop(1, '#00cec9');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 160);

        fishX += fishSpeed;
        if (fishX > 220 || fishX < 30) fishSpeed = -fishSpeed;

        ctx.save();
        ctx.translate(fishX, fishY + Math.sin(Date.now() * 0.005) * 8);
        if (fishSpeed < 0) ctx.scale(-1, 1);

        ctx.fillStyle = '#e17055';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(-24, -10);
        ctx.lineTo(-24, 10);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.updateAnimation = () => {
        updateScreen();
        texture.needsUpdate = true;
    };
    return texture;
}
