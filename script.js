import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

let scene, camera, renderer, water, rain, rainGeo;
let rainCount = 10000; // Nombre de gouttes
let isRaining = false;

init();
animate();

async function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(0, 500, 0);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    // 1. L'EAU
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    water = new Water(waterGeometry, {
        textureWidth: 512, textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', (t) => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
        }),
        sunDirection: new THREE.Vector3(), sunColor: 0xffffff, waterColor: 0x001e0f, distortionScale: 3.7
    });
    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    // 2. LE SYSTÈME DE PLUIE (Particules)
    rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
        positions[i] = Math.random() * 800 - 400;     // X
        positions[i + 1] = Math.random() * 500;       // Y (Hauteur)
        positions[i + 2] = Math.random() * 800 - 400; // Z
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const rainMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa, size: 0.7, transparent: true, opacity: 0.5
    });
    rain = new THREE.Points(rainGeo, rainMaterial);
    scene.add(rain);
    rain.visible = false; // Désactivé par défaut

    // 3. MISE À JOUR VISUELLE
    window.updateVisuals = function(temp, mode = '') {
        let ratio = Math.max(0, Math.min(1, (temp - 0) / 40));
        
        // Couleurs
        const colorCold = new THREE.Color(0x0044ff);
        const colorHot = new THREE.Color(0xff4400);
        water.material.uniforms['waterColor'].value.lerpColors(colorCold, colorHot, ratio);

        // Activation Pluie
        isRaining = (mode === 'pluie' || temp < 16); // Pluie si test ou froid
        rain.visible = isRaining;
        
        document.getElementById('temp-display').innerText = `${temp}°`;
    };

    loadMeteo();
}

async function loadMeteo() {
    try {
        const response = await fetch('meteo.json');
        const data = await response.json();
        // Accès aux données du dataset fourni
        const entry = data.history["2025-08-01"]["10:00"]; // Exemple d'entrée
        const temp = entry.temperature.current;
        document.getElementById('desc-display').innerText = entry.weather.description.toUpperCase();
        window.updateVisuals(temp);
    } catch (e) { window.updateVisuals(18); }
}

window.updateFromTest = (t, m) => {
    document.getElementById('desc-display').innerText = m.toUpperCase();
    window.updateVisuals(t, m);
};

function animate() {
    requestAnimationFrame(animate);
    
    // Animation de la pluie
    if (isRaining) {
        const positions = rainGeo.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= 3; // Vitesse de chute
            if (positions[i] < 0) positions[i] = 500; // Reset en haut
        }
        rainGeo.attributes.position.needsUpdate = true;
    }

    water.material.uniforms['time'].value += 1.0 / 60.0;
    renderer.render(scene, camera);
}