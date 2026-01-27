import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';

let container, camera, scene, renderer, water, sun, mesh;

init();
animate();

async function init() {
    // 1. Scène et Caméra
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(0, 500, 0);
    camera.lookAt(0, 0, 0);

    // 2. Rendu
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    // 3. L'Eau (Géométrie et Matériau spécial Water)
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    sun = new THREE.Vector3();

    water = new Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
    });

    water.rotation.x = -Math.PI / 2;
    scene.add(water);

    // 4. Le Ciel
    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    // 5. Paramètres du Soleil
    const parameters = { elevation: 2, azimuth: 180 };
    const pmremGenerator = new THREE.PMREMGenerator(renderer);

    window.updateSun = function(temp) {
        // Plus il fait chaud, plus le soleil descend (effet rouge/orange)
        // Ratio 0 (froid) à 1 (chaud)
        let ratio = Math.max(0, Math.min(1, (temp - 0) / 40));
        
        parameters.elevation = 2 - (ratio * 5); // Le soleil descend pour rougir l'eau
        
        const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
        const theta = THREE.MathUtils.degToRad(parameters.azimuth);
        sun.setFromSphericalCoords(1, phi, theta);
        
        sky.material.uniforms['sunPosition'].value.copy(sun);
        water.material.uniforms['sunDirection'].value.copy(sun).normalize();
        
        // Couleur de l'eau : plus bleue si froid, plus sombre/rouge si chaud
        const colorFroid = new THREE.Color(0x0044ff);
        const colorChaud = new THREE.Color(0xff4400);
        water.material.uniforms['waterColor'].value.lerpColors(colorFroid, colorChaud, ratio);

        scene.environment = pmremGenerator.fromScene(sky).texture;
    };

    // Chargement du JSON Initial
    loadMeteo();
}

async function loadMeteo() {
    try {
        const response = await fetch('meteo.json');
        const data = await response.json();
        // On récupère la température du test précédent
        const temp = data.history["2025-08-01"]["14:00"].temperature.current;
        const desc = data.history["2025-08-01"]["14:00"].weather.description;
        
        document.getElementById('temp-display').innerText = `${temp}°C`;
        document.getElementById('desc-display').innerText = desc;
        window.updateSun(temp);
    } catch (e) {
        window.updateSun(18); // Par défaut
    }
}

// Fonction pour les boutons de test
window.updateFromTest = function(temp) {
    document.getElementById('temp-display').innerText = `${temp}°C`;
    document.getElementById('desc-display').innerText = "Simulation";
    window.updateSun(temp);
};

function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    water.material.uniforms['time'].value += 1.0 / 60.0; // Animation des vagues
    renderer.render(scene, camera);
}

// Gérer le redimensionnement
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});