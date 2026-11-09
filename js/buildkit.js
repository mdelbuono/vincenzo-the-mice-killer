import * as THREE from 'three';
import { createStreetSignTexture } from './textures.js';

// Small helpers shared by the prop builders of the endless worlds and levels
// (rotterdam.js, newyork.js, casino.js).

export function std(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
}

export function addMesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
}

// A round bar from point a to point b (thinner at b when radiusB is given)
export function beam(parent, a, b, radius, material, radiusB = radius, segments = 8) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const length = dir.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusB, radius, length, segments), material);
    mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
}

// Stretches a geometry's texture coordinates so a texture repeats sx by sy times on it
export function scaleUV(geometry, sx, sy) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
    return geometry;
}

// A group at (x, z) turned by rotY
export function group(env, x, z, rotY = 0) {
    const g = env.propGroup(x, z);
    g.rotation.y = rotY;
    return g;
}

// A sign board with text, facing +z
export function addSign(parent, text, width, x, y, z, background, color) {
    const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(width, width / 4),
        new THREE.MeshBasicMaterial({ map: createStreetSignTexture(text, background, color), side: THREE.DoubleSide })
    );
    sign.position.set(x, y, z);
    parent.add(sign);
    return sign;
}

// A railing of posts with a top and a middle bar, from a to b (y gives the floor height at each x)
export function addRailing(parent, a, b, material, height = 1.1, floorY = () => 0, spacing = 1.2) {
    const steps = Math.max(1, Math.round(a.distanceTo(b) / spacing));
    let previous = null;
    for (let i = 0; i <= steps; i++) {
        const p = new THREE.Vector3().lerpVectors(a, b, i / steps);
        p.y = floorY(p.x);
        const top = p.clone().setY(p.y + height);
        beam(parent, p, top, 0.05, material, 0.05, 6);
        if (previous) {
            beam(parent, previous.clone().setY(previous.y + height), top, 0.06, material, 0.06, 6);
            beam(parent, previous.clone().setY(previous.y + height / 2), p.clone().setY(p.y + height / 2), 0.035, material, 0.035, 6);
        }
        previous = p;
    }
}

// Pseudo-random number from a seed, so the city looks the same every visit
export function seeded(seed) {
    const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
}

// A glass tower block (w x h x d) with its windows at a sensible size
export function tower(parent, x, z, w, h, d, texture, y = 0) {
    const geo = scaleUV(new THREE.BoxGeometry(w, h, d), Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 3)));
    const mesh = addMesh(parent, geo, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.25, metalness: 0.4 }), x, y + h / 2, z);
    mesh.castShadow = false;
    return mesh;
}

