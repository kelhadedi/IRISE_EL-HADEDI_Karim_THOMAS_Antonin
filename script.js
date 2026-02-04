import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

let scene, camera, renderer, water, rain, rainGeo;
let rainCount = 15000; 
let isRaining = false;
let globalData = null;
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

    loadMeteoAutomatique();
}

async function loadMeteoAutomatique() {
    try {
        const response = await fetch('meteo-type.json');
        globalData = await response.json();
        const m = globalData.current;
        mettreAJourInterface(m.temperature.current, m.weather.description, m.datetime);
    } catch (e) { console.error("Erreur JSON"); }
}

window.chargerDataSpecifique = function(date, heure) {
    if(globalData && globalData.history[date][heure]) {
        const d = globalData.history[date][heure];
        mettreAJourInterface(d.temperature.current, d.weather.description, d.datetime);
    }
};

function mettreAJourInterface(temp, condition, date) {
    currentCondition = condition.toLowerCase();
    document.getElementById('temp-display').innerText = `${Math.round(temp)}°`;
    document.getElementById('desc-display').innerText = condition.toUpperCase();
    document.getElementById('location').innerText = `RELEVÉ : ${date}`;
    
    // Visuels Three.js
    let ratio = Math.max(0, Math.min(1, (temp - (-5)) / 35));
    water.material.uniforms['waterColor'].value.lerpColors(new THREE.Color(0x0055ff), new THREE.Color(0xff3300), ratio);
    
    const motsPluie = ["nuageux", "couvert", "pluie", "orage", "rain"];
    isRaining = motsPluie.some(mot => currentCondition.includes(mot));
    rain.visible = isRaining;
}

window.afficherPoeme = function() {
    let type = "clair";
    
    // On récupère la température affichée pour décider
    let temp = parseFloat(document.getElementById('temp-display').innerText);

    if (temp < 5) { 
        // Si il fait très froid (Hiver), on met Le Goffic
        type = "hiver";
    } else if (isRaining) {
        // Si il pleut ou orage (mais pas glacial), on met Verlaine
        type = "pluie";
    } else if (currentCondition.includes("nuage") || currentCondition.includes("couvert")) {
        // Si c'est juste nuageux et doux
        type = "hiver"; 
    }

    document.getElementById('poem-text').innerText = poemes[type];
    document.getElementById('poem-box').style.display = "flex";
};

window.fermerPoeme = function() {
    document.getElementById('poem-box').style.display = "none";
};

function animate() {
    requestAnimationFrame(animate);
    if (isRaining) {
        const p = rainGeo.attributes.position.array;
        for (let i = 1; i < p.length; i += 3) {
            p[i] -= 4; if (p[i] < 0) p[i] = 600;
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