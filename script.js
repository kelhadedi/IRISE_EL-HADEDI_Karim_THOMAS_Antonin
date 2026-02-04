import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';

let scene, camera, renderer, water, rain, rainGeo;
let rainCount = 15000; 
let isRaining = false;
let globalData = null;
let currentCondition = "";

// POÉSIES CLASSIQUES INTÉGRALES
const poemes = {
    nuageux: "Le ciel est plus gris qu'une feuille morte\nQui traîna longtemps dans la boue et l'eau ;\nLes rameaux menus que le vent emporte\nSont les os du pin et ceux du bouleau.\n\nOn entend couler ainsi que des larmes\nQuelques gouttes d'eau dans les rochers noirs ;\nCet instant glacé a pour moi des charmes.\nIl ne change rien à mes désespoirs.\n\nRien ne me rebute et rien ne m'attire ;\nL'hiver me sourit dans ses jours neigeants,\nEt quand il viendra, je laisserai rire\nLe jeune printemps.\n\n— Cécile Sauvage",

    pluie: "Il pleure dans mon cœur\nComme il pleut sur la ville ;\nQuelle est cette langueur\nQui pénètre mon cœur ?\n\nÔ bruit doux de la pluie\nPar terre et sur les toits !\nPour un cœur qui s'ennuie,\nÔ le chant de la pluie !\n\nIl pleure sans raison\nDans ce cœur qui s'écœure.\nQuoi ! nulle trahison ?...\nCe deuil est sans raison.\n\nC'est bien la pire peine\nDe ne savoir pourquoi\nSans amour et sans haine\nMon cœur a tant de peine !\n\n— Paul Verlaine",

    clair: "Par les soirs bleus d'été, j'irai dans les sentiers,\nPicoté par les blés, fouler l'herbe menue :\nRêveur, j'en sentirai la fraîcheur à mes pieds.\nJe laisserai le vent baigner ma tête nue.\n\nJe ne parlerai pas, je ne penserai rien :\nMais l'amour infini me montera dans l'âme,\nEt j'irai loin, bien loin, comme un bohémien,\nPar la Nature, — heureux comme avec une femme.\n\n— Arthur Rimbaud"
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
    if (isRaining) type = "pluie";
    else if (currentCondition.includes("nuage") || currentCondition.includes("couvert")) type = "nuageux";
    
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