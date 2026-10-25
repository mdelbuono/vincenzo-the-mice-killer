import * as THREE from 'three';

// --- Procedural Canvas Textures ---
export function createNameTagTexture(name = 'Vincenzo') {
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
    ctx.fillText(`🐾 ${name}`, 150, 40);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

export function createCatchPromptTexture() {
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
export function createParquetTexture() {
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
export function createAtticFloorTexture() {
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
export function createBasementFloorTexture() {
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
export function createBasementWallTexture() {
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

// 5. Kitchen Checkerboard Floor Texture
export function createKitchenFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const tiles = 8;
    const size = 512 / tiles;
    for (let r = 0; r < tiles; r++) {
        for (let c = 0; c < tiles; c++) {
            const light = (r + c) % 2 === 0;
            const shade = Math.floor(Math.random() * 10);
            ctx.fillStyle = light ? `rgb(${238 - shade}, ${234 - shade}, ${224 - shade})` : `rgb(${45 + shade}, ${52 + shade}, ${64 + shade})`;
            ctx.fillRect(c * size, r * size, size, size);

            // Soft shine in the corner of each tile
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(c * size + 6, r * size + 6, size / 3, size / 3);
        }
    }

    // Grout lines
    ctx.strokeStyle = 'rgba(120,120,120,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += size) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 2.5);
    return texture;
}

// 6. Kitchen Mint Subway Tile Wall Texture
export function createKitchenWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#d9d2c3';
    ctx.fillRect(0, 0, 512, 512);

    const tH = 24;
    const tW = 48;
    for (let y = 0; y < 512; y += tH) {
        const shift = (y / tH) % 2 === 0 ? 0 : tW / 2;
        for (let x = -tW; x < 512; x += tW) {
            const shade = Math.floor(Math.random() * 12);
            ctx.fillStyle = `rgb(${168 + shade}, ${222 + shade / 2}, ${204 + shade / 2})`;
            ctx.fillRect(x + shift + 2, y + 2, tW - 4, tH - 4);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    return texture;
}

// 7. Bedroom Soft Carpet Texture
export function createCarpetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#3c4f7a';
    ctx.fillRect(0, 0, 512, 512);

    // Fluffy fibers
    for (let i = 0; i < 9000; i++) {
        const shade = Math.random();
        ctx.fillStyle = shade > 0.5 ? 'rgba(120,140,200,0.18)' : 'rgba(20,30,60,0.18)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 3);
    return texture;
}

// 8. Bedroom Wallpaper Texture (lilac stripes with little stars)
export function createBedroomWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    for (let x = 0; x < 512; x += 64) {
        ctx.fillStyle = (x / 64) % 2 === 0 ? '#8e7cc3' : '#9d8dd0';
        ctx.fillRect(x, 0, 64, 512);
    }

    ctx.fillStyle = 'rgba(255, 234, 167, 0.8)';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    for (let y = 40; y < 512; y += 96) {
        for (let x = 32; x < 512; x += 128) {
            const offset = (y / 96) % 2 < 1 ? 0 : 64;
            ctx.fillText('★', x + offset, y);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    return texture;
}

export function createRugTexture() {
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

export function createTVCanvasTexture() {
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

// Small helpers shared by the textures below
function makeCanvas(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return [canvas, canvas.getContext('2d')];
}

function repeatingTexture(canvas, rx, ry) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(rx, ry);
    return texture;
}

// 9. Backyard Grass Lawn
export function createGrassTexture() {
    const [canvas, ctx] = makeCanvas();
    ctx.fillStyle = '#5a9e3c';
    ctx.fillRect(0, 0, 512, 512);
    // Mowing stripes
    for (let x = 0; x < 512; x += 128) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, 0, 64, 512);
    }
    // Blades of grass
    for (let i = 0; i < 7000; i++) {
        const shade = Math.random();
        ctx.strokeStyle = shade > 0.5 ? 'rgba(140,200,90,0.5)' : 'rgba(40,90,30,0.45)';
        ctx.lineWidth = 1.5;
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 4 - Math.random() * 5);
        ctx.stroke();
    }
    // A few daisies
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = '#ffffff';
        for (let p = 0; p < 5; p++) {
            const a = (p / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#feca57';
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }
    return repeatingTexture(canvas, 4, 3);
}

// 10. Backyard Wooden Fence Planks
export function createFenceTexture() {
    const [canvas, ctx] = makeCanvas();
    const plankW = 64;
    for (let x = 0; x < 512; x += plankW) {
        const shade = Math.floor(Math.random() * 20);
        ctx.fillStyle = `rgb(${176 + shade}, ${124 + shade}, ${78 + shade})`;
        ctx.fillRect(x, 0, plankW, 512);
        // Wood grain
        ctx.strokeStyle = 'rgba(90,55,25,0.25)';
        ctx.lineWidth = 1;
        for (let g = 0; g < 5; g++) {
            const gx = x + 8 + Math.random() * (plankW - 16);
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.bezierCurveTo(gx + 4, 170, gx - 4, 340, gx + 2, 512);
            ctx.stroke();
        }
        // Gap between planks
        ctx.fillStyle = 'rgba(40,25,10,0.7)';
        ctx.fillRect(x, 0, 3, 512);
        // Nails on the crossbars
        ctx.fillStyle = '#555';
        [120, 400].forEach(y => {
            ctx.beginPath();
            ctx.arc(x + plankW / 2, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    // Two horizontal crossbars
    ctx.fillStyle = 'rgba(120,80,45,0.55)';
    ctx.fillRect(0, 105, 512, 30);
    ctx.fillRect(0, 385, 512, 30);
    return repeatingTexture(canvas, 6, 1);
}

// 11. Workshop Cracked, Oil-Stained Concrete
export function createConcreteTexture() {
    const [canvas, ctx] = makeCanvas();
    ctx.fillStyle = '#7b7f80';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 12000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    // Oil stains
    for (let i = 0; i < 6; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const grad = ctx.createRadialGradient(x, y, 2, x, y, 30 + Math.random() * 40);
        grad.addColorStop(0, 'rgba(20,20,25,0.55)');
        grad.addColorStop(1, 'rgba(20,20,25,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 80, y - 80, 160, 160);
    }
    // Cracks
    ctx.strokeStyle = 'rgba(30,30,30,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
        let x = Math.random() * 512;
        let y = Math.random() * 512;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 6; s++) {
            x += (Math.random() - 0.5) * 50;
            y += (Math.random() - 0.5) * 50;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    // Expansion joints
    ctx.strokeStyle = 'rgba(40,40,40,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(256, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 256); ctx.lineTo(512, 256); ctx.stroke();
    return repeatingTexture(canvas, 3, 2.5);
}

// 12. Workshop Rusty Corrugated Metal Wall
export function createCorrugatedMetalTexture() {
    const [canvas, ctx] = makeCanvas();
    for (let x = 0; x < 512; x += 16) {
        const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
        grad.addColorStop(0, '#5d6d6e');
        grad.addColorStop(0.5, '#95a5a6');
        grad.addColorStop(1, '#5d6d6e');
        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, 16, 512);
    }
    // Rust patches dripping down
    for (let i = 0; i < 14; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const grad = ctx.createRadialGradient(x, y, 2, x, y, 20 + Math.random() * 35);
        grad.addColorStop(0, 'rgba(150,70,20,0.75)');
        grad.addColorStop(1, 'rgba(150,70,20,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 60, y - 60, 120, 160);
    }
    // Panel seams with rivets
    ctx.fillStyle = 'rgba(30,30,30,0.6)';
    ctx.fillRect(0, 250, 512, 6);
    ctx.fillStyle = '#3d3d3d';
    for (let x = 8; x < 512; x += 32) {
        ctx.beginPath();
        ctx.arc(x, 253, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    return repeatingTexture(canvas, 4, 1.5);
}

// 13. Supermarket Shiny White Floor Tiles
export function createSupermarketFloorTexture() {
    const [canvas, ctx] = makeCanvas();
    const size = 64;
    for (let y = 0; y < 512; y += size) {
        for (let x = 0; x < 512; x += size) {
            const shade = Math.floor(Math.random() * 8);
            // Every now and then a colored tile
            const accent = ((x / size) * 3 + (y / size) * 5) % 11 === 0;
            ctx.fillStyle = accent ? '#74b9ff' : `rgb(${236 - shade}, ${238 - shade}, ${240 - shade})`;
            ctx.fillRect(x, y, size, size);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(x + 6, y + 6, size / 2.5, 4);
        }
    }
    ctx.strokeStyle = 'rgba(150,160,170,0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += size) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    return repeatingTexture(canvas, 4, 3);
}

// 14. Supermarket Wall with a Colorful Stripe and Department Signs
export function createSupermarketWallTexture() {
    const [canvas, ctx] = makeCanvas();
    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(0, 0, 512, 512);
    // Red / yellow brand stripe
    ctx.fillStyle = '#e84118';
    ctx.fillRect(0, 300, 512, 40);
    ctx.fillStyle = '#fbc531';
    ctx.fillRect(0, 340, 512, 14);
    // Lower wall panel
    ctx.fillStyle = '#dcdde1';
    ctx.fillRect(0, 354, 512, 158);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧀 CHEESE', 128, 320);
    ctx.fillText('🍎 FRESH', 384, 320);
    return repeatingTexture(canvas, 4, 1);
}

// 15. Boat Deck Planks (teak with dark caulking)
export function createDeckTexture() {
    const [canvas, ctx] = makeCanvas();
    const plankH = 32;
    for (let y = 0; y < 512; y += plankH) {
        const shade = Math.floor(Math.random() * 18);
        ctx.fillStyle = `rgb(${170 + shade}, ${118 + shade}, ${70 + shade})`;
        ctx.fillRect(0, y, 512, plankH);
        ctx.strokeStyle = 'rgba(100,60,30,0.25)';
        for (let g = 0; g < 4; g++) {
            const gy = y + 5 + Math.random() * (plankH - 10);
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.bezierCurveTo(170, gy + 3, 340, gy - 3, 512, gy + 1);
            ctx.stroke();
        }
        ctx.fillStyle = '#2d2016';
        ctx.fillRect(0, y, 512, 3);
        // Plank ends are staggered
        const end = ((y / plankH) % 4) * 128 + 40;
        ctx.fillRect(end, y, 3, plankH);
    }
    return repeatingTexture(canvas, 3, 3);
}

// 16. Boat Hull Side (white with a blue waterline stripe)
export function createHullTexture() {
    const [canvas, ctx] = makeCanvas();
    ctx.fillStyle = '#f1f2f6';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#0c2461';
    ctx.fillRect(0, 330, 512, 80);
    ctx.fillStyle = '#e55039';
    ctx.fillRect(0, 410, 512, 102);
    // Portholes
    for (let x = 64; x < 512; x += 128) {
        ctx.fillStyle = '#b8a07e';
        ctx.beginPath();
        ctx.arc(x, 170, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a69bd';
        ctx.beginPath();
        ctx.arc(x, 170, 24, 0, Math.PI * 2);
        ctx.fill();
    }
    return repeatingTexture(canvas, 6, 1);
}

// 17. Sea Water (deep blue with foam streaks)
export function createWaterTexture() {
    const [canvas, ctx] = makeCanvas();
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#0a3d62');
    grad.addColorStop(1, '#1e6f9f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 10, y - 6, x + 22, y);
        ctx.stroke();
    }
    return repeatingTexture(canvas, 10, 10);
}

// 18. Spaceship Metal Floor Panels with Glowing Seams
export function createSpaceFloorTexture() {
    const [canvas, ctx] = makeCanvas();
    ctx.fillStyle = '#2f3640';
    ctx.fillRect(0, 0, 512, 512);
    const size = 128;
    for (let y = 0; y < 512; y += size) {
        for (let x = 0; x < 512; x += size) {
            const grad = ctx.createLinearGradient(x, y, x + size, y + size);
            grad.addColorStop(0, '#4b5563');
            grad.addColorStop(1, '#353b48');
            ctx.fillStyle = grad;
            ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
            // Grip pattern
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            for (let d = 16; d < size - 8; d += 16) {
                ctx.fillRect(x + d, y + 12, 6, size - 24);
            }
            // Bolts
            ctx.fillStyle = '#a4b0be';
            [[10, 10], [size - 10, 10], [10, size - 10], [size - 10, size - 10]].forEach(([bx, by]) => {
                ctx.beginPath();
                ctx.arc(x + bx, y + by, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }
    // Cyan light strips in the seams
    ctx.fillStyle = 'rgba(0, 210, 211, 0.8)';
    for (let i = 0; i <= 512; i += size) {
        ctx.fillRect(i - 1, 0, 2, 512);
        ctx.fillRect(0, i - 1, 512, 2);
    }
    return repeatingTexture(canvas, 3, 2.5);
}

// 19. Spaceship Wall Panels with Status Lights
export function createSpaceWallTexture() {
    const [canvas, ctx] = makeCanvas();
    ctx.fillStyle = '#dfe4ea';
    ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 128) {
        ctx.fillStyle = '#ced6e0';
        ctx.fillRect(x + 6, 20, 116, 220);
        ctx.fillRect(x + 6, 272, 116, 220);
        ctx.strokeStyle = '#a4b0be';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 6, 20, 116, 220);
        ctx.strokeRect(x + 6, 272, 116, 220);
        // Little status lights
        ['#2ed573', '#ffa502', '#ff4757'].forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.arc(x + 30 + i * 18, 290, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    // Glowing blue band in the middle
    ctx.fillStyle = '#1e90ff';
    ctx.fillRect(0, 246, 512, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(0, 254, 512, 4);
    return repeatingTexture(canvas, 4, 1);
}

// Door sign for the endless house ("🍳 Kitchen")
export function createDoorSignTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255, 165, 2, 0.95)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.rect(6, 6, 308, 68);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a1a24';
    ctx.font = 'bold 34px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 160, 42);
    return new THREE.CanvasTexture(canvas);
}

// Supermarket shelf contents: rows of colorful packages, cans and bottles
export function createProductsTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2f3640';
    ctx.fillRect(0, 0, 512, 64);
    const colors = ['#e84118', '#fbc531', '#4cd137', '#00a8ff', '#9c88ff', '#ffffff', '#e1b12c', '#f368e0', '#ff9f43'];
    let x = 2;
    while (x < 510) {
        const w = 14 + Math.floor(Math.random() * 22);
        const h = 30 + Math.floor(Math.random() * 30);
        const color = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillStyle = color;
        if (Math.random() < 0.3) {
            // Bottle: narrow neck
            ctx.fillRect(x, 64 - h, w, h - 10);
            ctx.fillRect(x + w / 3, 64 - h - 6, w / 3, 12);
        } else {
            ctx.fillRect(x, 64 - h, w, h);
        }
        // Label band
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x + 2, 64 - h / 2 - 4, w - 4, 8);
        x += w + 3;
    }
    return new THREE.CanvasTexture(canvas);
}

// Deep space with stars and a ringed planet (seen through the spaceship windows)
export function createStarfieldTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, '#05051a');
    grad.addColorStop(1, '#1b0b3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 260; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`;
        const s = Math.random() < 0.1 ? 2.5 : 1.2;
        ctx.fillRect(Math.random() * 512, Math.random() * 256, s, s);
    }
    // Ringed planet
    const px = 360, py = 120;
    const planet = ctx.createRadialGradient(px - 15, py - 15, 5, px, py, 50);
    planet.addColorStop(0, '#ffbe76');
    planet.addColorStop(1, '#c0392b');
    ctx.fillStyle = planet;
    ctx.beginPath();
    ctx.arc(px, py, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 234, 167, 0.8)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(px, py, 85, 18, -0.3, 0, Math.PI * 2);
    ctx.stroke();
    // A small moon
    ctx.fillStyle = '#dfe6e9';
    ctx.beginPath();
    ctx.arc(110, 70, 14, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
}

// Black pirate flag with a big white paw print
export function createPawFlagTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e1e24';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(128, 100, 34, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    [[84, 58], [112, 40], [144, 40], [172, 58]].forEach(([tx, ty]) => {
        ctx.beginPath();
        ctx.ellipse(tx, ty, 13, 16, 0, 0, Math.PI * 2);
        ctx.fill();
    });
    return new THREE.CanvasTexture(canvas);
}

// Underwater: rippled sea-floor sand with shells and pebbles
export function createSandTexture() {
    const [canvas, ctx] = makeCanvas();
    ctx.fillStyle = '#d9c38f';
    ctx.fillRect(0, 0, 512, 512);
    // Ripples left by the current
    for (let y = 0; y < 512; y += 18) {
        ctx.strokeStyle = 'rgba(160,130,80,0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x <= 512; x += 8) {
            ctx.lineTo(x, y + Math.sin(x * 0.03 + y) * 4);
        }
        ctx.stroke();
    }
    for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,245,210,0.5)' : 'rgba(140,110,60,0.35)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    // Little pebbles and pink shells
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = i % 3 ? '#a4917a' : '#ffb8c6';
        ctx.beginPath();
        ctx.ellipse(x, y, 4 + Math.random() * 3, 3, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    return repeatingTexture(canvas, 4, 3);
}

// Underwater: a wall of reef rock with patches of coral and algae
export function createReefWallTexture() {
    const [canvas, ctx] = makeCanvas();
    ctx.fillStyle = '#3d5a6c';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 160; i++) {
        const shade = 50 + Math.random() * 50;
        ctx.fillStyle = `rgb(${shade * 0.7}, ${shade * 1.05}, ${shade * 1.2})`;
        ctx.beginPath();
        ctx.ellipse(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 40, 14 + Math.random() * 26, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    const coral = ['#ff7675', '#fd79a8', '#fdcb6e', '#a29bfe', '#55efc4'];
    for (let i = 0; i < 70; i++) {
        ctx.fillStyle = coral[i % coral.length];
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(Math.random() * 512, 300 + Math.random() * 212, 3 + Math.random() * 6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Algae hanging down from the top
    for (let i = 0; i < 60; i++) {
        ctx.strokeStyle = 'rgba(46,160,90,0.6)';
        ctx.lineWidth = 3;
        const x = Math.random() * 512;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x + 10, 40, x - 4, 60 + Math.random() * 80);
        ctx.stroke();
    }
    return repeatingTexture(canvas, 3, 1);
}

// Level 11 (the shop): price tag on the counter in front of every item
export function createShopTagTexture(item, owned = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffaf0';
    ctx.strokeStyle = owned ? '#2ed573' : '#ffa502';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.rect(4, 4, 248, 120);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1a24';
    ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`${item.icon} ${item.name}`, 128, 42, 236);
    ctx.fillStyle = owned ? '#218c4f' : '#d35400';
    ctx.font = 'bold 34px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(owned ? 'OWNED ✓' : `🥫 ${item.price.toLocaleString('en-US')}`, 128, 90, 236);
    return new THREE.CanvasTexture(canvas);
}

// Level 11 (the shop): a big icon on the front of a product box
export function createIconTexture(icon, background = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 128, 128);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '84px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText(icon, 64, 70);
    return new THREE.CanvasTexture(canvas);
}
