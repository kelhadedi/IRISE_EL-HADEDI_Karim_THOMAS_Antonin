import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

let scene, camera, renderer, water, rain, rainGeo;
let rainCount = 15000; 
let isRaining = false;

init();
animate();

async function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(0, 500, 0);
    camera.lookAt(0, 0, 700);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    // 1. L'EAU
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    water = new Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', (t) => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
        }),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7
    });
    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    // 2. PLUIE
    rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
        positions[i] = Math.random() * 1000 - 500;
        positions[i + 1] = Math.random() * 600; 
        positions[i + 2] = Math.random() * 500 - 250;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.4 }));
    scene.add(rain);

    // 3. CHARGEMENT AUTO
    loadMeteoAutomatique();
}

async function loadMeteoAutomatique() {
    try {
        const response = await fetch('meteo.json');
        const data = await response.json();

        // --- LOGIQUE POUR TROUVER LA DERNIÈRE INFO ---
        const dates = Object.keys(data.history).sort(); // Récupère toutes les dates
        const derniereDate = dates[dates.length - 1]; // Prend la plus récente
        
        const heures = Object.keys(data.history[derniereDate]).sort(); // Récupère les heures
        const derniereHeure = heures[heures.length - 1]; // Prend la plus récente
        
        const pointMeteo = data.history[derniereDate][derniereHeure];

        // --- EXTRACTION ---
        const temp = pointMeteo.temperature.current;
        const condition = pointMeteo.weather.description;
        const dateReelle = pointMeteo.datetime || `${derniereDate} ${derniereHeure}`;

        // Mise à jour de l'affichage
        document.getElementById('temp-display').innerText = `${Math.round(temp)}°`;
        document.getElementById('desc-display').innerText = condition.toUpperCase();
        document.getElementById('location').innerText = `DERNIÈRE DATA : ${dateReelle}`;

        appliquerVisuels(temp, condition);

    } catch (e) {
        console.error("Erreur de lecture JSON:", e);
        document.getElementById('desc-display').innerText = "VÉRIFIEZ LE FICHIER METEO.JSON";
    }
}

function appliquerVisuels(temp, condition) {
    // Couleur de l'eau
    let ratio = Math.max(0, Math.min(1, (temp - 10) / 25));
    water.material.uniforms['waterColor'].value.lerpColors(
        new THREE.Color(0x0055ff), 
        new THREE.Color(0xff3300), 
        ratio
    );

    // Pluie automatique
    const motsPluie = ["nuageux", "couvert", "pluie", "orage", "nuages", "partiellement"];
    isRaining = motsPluie.some(mot => condition.toLowerCase().includes(mot));
    rain.visible = isRaining;
}

// Les fonctions de test restent pour forcer le visuel si besoin
window.updateFromTest = function(t, label) {
    document.getElementById('temp-display').innerText = `${t}°`;
    document.getElementById('desc-display').innerText = label.toUpperCase();
    appliquerVisuels(t, label);
};

function animate() {
    requestAnimationFrame(animate);
    if (isRaining) {
        const positions = rainGeo.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= 4;
            if (positions[i] < 0) positions[i] = 600;
        }
        rainGeo.attributes.position.needsUpdate = true;
    }
    water.material.uniforms['time'].value += 1.0 / 60.0;
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});