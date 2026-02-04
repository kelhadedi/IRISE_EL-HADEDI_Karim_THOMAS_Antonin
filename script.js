import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

let scene, camera, renderer, water, rain, rainGeo, globalData;
let isRaining = false;
let rainSpeed = 3; // Vitesse de chute dynamique
let currentCondition = "";

// POÉSIES CLASSIQUES INTÉGRALES
const poemes = {
    hiver: "La mer est grise et le ciel est de plomb,\nL'hiver a mis son givre aux fentes des rochers ;\nOn n'entend plus, le long du morne vallon,\nQue le cri des oiseaux qui cherchent leurs clochers.\n\nTout est de glace, et le vent qui s'élève\nApporte avec lui le sel des embruns ;\nLa terre s'endort dans un pénible rêve\nOù flottent des souvenirs défunts.\n\n— Charles Le Goffic",
    pluie: "Il pleure dans mon cœur\nComme il pleut sur la ville ;\nQuelle est cette langueur\nQui pénètre mon cœur ?\n\nÔ bruit doux de la pluie\nPar terre et sur les toits !\nPour un cœur qui s'ennuie,\nÔ le chant de la pluie !\n\n— Paul Verlaine",
    clair: "Par les soirs bleus d'été, j'irai dans les sentiers,\nPicoté par les blés, fouler l'herbe menue :\nRêveur, j'en sentirai la fraîcheur à mes pieds.\nJe laisserai le vent baigner ma tête nue.\n\n— Arthur Rimbaud"
};

init();
animate();

async function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(0, 50, 0); 
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

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

    // Système de pluie
    rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(15000 * 3);
    for (let i = 0; i < 45000; i++) positions[i] = (Math.random() - 0.5) * 1500;
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Matériau de pluie avec gestion de l'opacité
    const rainMaterial = new THREE.PointsMaterial({ 
        color: 0xffffff, 
        size: 0.3, 
        transparent: true, 
        opacity: 0.3 
    });
    
    rain = new THREE.Points(rainGeo, rainMaterial);
    scene.add(rain);

    loadMeteo();
}

async function loadMeteo() {
    try {
        const response = await fetch('meteo-type.json');
        globalData = await response.json();
        updateExperience(globalData.current);
    } catch (e) { console.error("Erreur chargement JSON"); }
}

window.chargerDataSpecifique = function(date, heure) {
    if(globalData && globalData.history[date] && globalData.history[date][heure]) {
        updateExperience(globalData.history[date][heure]);
    }
};

function updateExperience(data) {
    currentCondition = data.weather.description.toLowerCase();
    const temp = data.temperature.current;
    const windSpeed = data.wind.speed;

    // Mise à jour de l'UI
    document.getElementById('date-display').innerText = data.datetime.toUpperCase();
    document.getElementById('temp-display').innerText = `${Math.round(temp)}°`;
    document.getElementById('feels-like').innerText = `RESSENTI : ${Math.round(data.temperature.feels_like)}°`;
    document.getElementById('wind-speed').innerText = `${windSpeed} KM/H`;
    document.getElementById('wind-dir').innerText = `VENT ${data.wind.direction_text}`;
    document.getElementById('desc-display').innerText = data.weather.description.toUpperCase();
    document.getElementById('cloud-cov').innerText = `COUVERTURE : ${data.atmosphere.clouds}%`;

    // Visuels Three.js : Couleur de l'eau
    let ratio = Math.max(0, Math.min(1, (temp - (-5)) / 35));
    water.material.uniforms['waterColor'].value.lerpColors(new THREE.Color(0x0055ff), new THREE.Color(0xff3300), ratio);
    
    // Vent -> Agitation de l'eau
    water.material.uniforms['distortionScale'].value = 2.0 + Math.min(8.0, windSpeed / 2);

    // LOGIQUE DE L'INTENSITÉ DE LA PLUIE
    isRaining = ["pluie", "orage", "rain"].some(mot => currentCondition.includes(mot));
    
    if (currentCondition.includes("heavy") || windSpeed > 10) {
        // MODE ORAGE : Pluie rapide et très visible
        rainSpeed = 12; 
        rain.material.opacity = 0.8;
        rain.material.size = 0.5;
    } else {
        // MODE HIVER / PLUIE NORMALE : Pluie lente et discrète
        rainSpeed = 3; 
        rain.material.opacity = 0.3;
        rain.material.size = 0.2;
    }

    rain.visible = isRaining;
}

window.afficherPoeme = function() {
    let type = "clair";
    let temp = parseFloat(document.getElementById('temp-display').innerText);

    if (temp < 6 || currentCondition.includes("nuage") || currentCondition.includes("couvert")) {
        type = "hiver"; 
    } else if (isRaining) {
        type = "pluie"; 
    }
    
    document.getElementById('poem-text').innerText = poemes[type];
    document.getElementById('poem-box').style.display = "flex";
};

window.fermerPoeme = function() { document.getElementById('poem-box').style.display = "none"; };

function animate() {
    requestAnimationFrame(animate);
    if (isRaining) {
        const p = rainGeo.attributes.position.array;
        for (let i = 1; i < p.length; i += 3) { 
            p[i] -= rainSpeed; // On utilise la vitesse dynamique ici
            if (p[i] < 0) p[i] = 400; 
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