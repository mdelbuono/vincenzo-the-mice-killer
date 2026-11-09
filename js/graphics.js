import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// --- Realistic rendering ---
// The game's colors are written as normal (sRGB) hex values. For realistic
// lighting Three.js has to do its light maths in linear color, so every new
// material and light gets its colors converted once (see `upgradeScene`), the
// renderer converts back to sRGB on screen and a filmic tone mapper keeps
// bright lamps from blowing out. A soft "photo studio" environment map adds
// gentle reflections and bounce light to every MeshStandardMaterial.

const upgraded = new WeakSet(); // materials and lights already converted

let maxAnisotropy = 1;

export function setupRealisticRenderer(renderer, scene) {
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    // Image-based lighting: a blurred room, so shiny things reflect something
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
}

function upgradeTexture(tex, isColor) {
    if (!tex) return;
    let changed = false;
    if (isColor && tex.encoding !== THREE.sRGBEncoding) { tex.encoding = THREE.sRGBEncoding; changed = true; }
    if (tex.anisotropy < maxAnisotropy) { tex.anisotropy = maxAnisotropy; changed = true; }
    if (changed) tex.needsUpdate = true;
}

function upgradeMaterial(mat, mesh) {
    if (upgraded.has(mat)) return;
    upgraded.add(mat);
    if (mat.color) mat.color.convertSRGBToLinear();
    if (mat.emissive) mat.emissive.convertSRGBToLinear();
    upgradeTexture(mat.map, true);
    upgradeTexture(mat.emissiveMap, true);
    upgradeTexture(mat.bumpMap, false);

    if (mat.isMeshStandardMaterial) {
        // Subtle reflections; metal reflects more
        mat.envMapIntensity = mat.metalness > 0.4 ? 1.0 : 0.3;
    } else {
        // Glowing screens, signs, particles and labels keep their exact colors
        mat.toneMapped = false;
    }
    mat.needsUpdate = true;
}

function upgradeLight(light) {
    if (upgraded.has(light)) return;
    upgraded.add(light);
    light.color.convertSRGBToLinear();
    if (light.groundColor) light.groundColor.convertSRGBToLinear();
    // The environment map already fills in the shadows, so flat ambient light
    // is turned down: the room gets more depth and contrast
    if (light.isAmbientLight) light.intensity *= 0.4;
    if (light.isHemisphereLight) light.intensity *= 0.6;
    if (light.castShadow && light.shadow) {
        light.shadow.bias = -0.0004;
        light.shadow.normalBias = 0.02;
        light.shadow.radius = 3;
        if (light.shadow.mapSize.width < 2048) light.shadow.mapSize.set(2048, 2048);
    }
}

/**
 * Converts every material and light that was added since the last call.
 * Cheap enough to run every frame: already-upgraded things are skipped.
 */
export function upgradeScene(root) {
    root.traverse(obj => {
        if (obj.isLight) { upgradeLight(obj); return; }
        const mat = obj.material;
        if (!mat) return;
        if (Array.isArray(mat)) mat.forEach(m => upgradeMaterial(m, obj));
        else upgradeMaterial(mat, obj);
        // Solid surfaces catch the shadows of the cat, mice and furniture
        if (obj.isMesh && !obj.userData.noShadowReceive && mat.isMeshStandardMaterial && !mat.transparent) {
            obj.receiveShadow = true;
        }
    });
}

/**
 * Changes a material color at runtime (blinking lights, golden mice...).
 * Use this instead of color.setHex / setHSL so the color stays correct
 * whether or not the material was already upgraded.
 */
export function setMaterialColor(mat, key, hex) {
    mat[key].setHex(hex);
    if (upgraded.has(mat)) mat[key].convertSRGBToLinear();
}

export function setMaterialHSL(mat, h, s, l) {
    mat.color.setHSL(h, s, l);
    if (upgraded.has(mat)) mat.color.convertSRGBToLinear();
}

/**
 * A tileable grey "fur" texture, used as a bump map so the cat and mice
 * look soft instead of plastic.
 */
let furTexture = null;
export function getFurBumpTexture() {
    if (furTexture) return furTexture;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    // Thousands of short hair strokes, all leaning roughly the same way
    for (let i = 0; i < 9000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const len = 3 + Math.random() * 6;
        const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.7;
        const shade = Math.floor(70 + Math.random() * 120);
        ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
        ctx.lineWidth = 0.6 + Math.random() * 0.8;
        for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
            ctx.beginPath();
            ctx.moveTo(x + dx, y + dy);
            ctx.lineTo(x + dx + Math.cos(angle) * len, y + dy + Math.sin(angle) * len);
            ctx.stroke();
        }
    }
    furTexture = new THREE.CanvasTexture(canvas);
    furTexture.wrapS = furTexture.wrapT = THREE.RepeatWrapping;
    furTexture.repeat.set(3, 3);
    return furTexture;
}
