import * as THREE from 'three';
import { pauseAudio, selectMusic, setVolume, sound, startAudio } from './audio';
import { cell, HEIGHT, level, SIZE, tiles, walkable, WIDTH, world, type EnemyKind, type Point } from './level';
import './style.css';

type Kind = EnemyKind;
type Weapon = 0 | 1 | 2;
type Enemy = { mesh: THREE.Group; moving: THREE.Group; kind: Kind; hp: number; cooldown: number; flash: number; radius: number; speed: number };
type Pickup = { mesh: THREE.Group; type: 'module' | 'health' | 'ammo'; index?: number; phase: number; glow?: THREE.Sprite };
type Bolt = { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; damage: number; trail?: number };
type Particle = { mesh: THREE.Mesh | THREE.Sprite; velocity: THREE.Vector3; life: number; duration: number; gravity: number };
type Tracer = { mesh: THREE.Mesh; start: THREE.Vector3; end: THREE.Vector3; elapsed: number; duration: number };

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <canvas id="game"></canvas><div id="vignette"></div><div id="damage"></div>
  <div id="hud">
    <div class="topline"></div>
    <div class="topbar"><div><div class="brand">FRAG<span>QUENCE</span></div><div class="subbrand">BOUYGUES TELECOM / ${level.name}</div></div><div class="objective"><b>MISSION // RECONNEXION</b><div id="objective-text"></div></div></div>
    <div id="minimap-wrap"><div class="map-title">CARTOGRAPHIE // ${level.number}</div><canvas id="minimap" width="320" height="260"></canvas></div>
    <div id="crosshair"></div><div id="prompt"></div><div id="toast"></div>
    <div class="bottom"><div class="stat"><small>INTEGRITE</small><b id="health">100</b></div><div class="arsenal"><div class="arsenal-title">ARSENAL // 1-3</div><div id="weapon-list"></div></div><div class="weapon"><small>ARME ACTIVE // <span id="ammo"></span></small><b id="weapon">IMPULSION</b><span id="reload-hint"></span></div></div>
  </div>
  <div id="overlay"><div class="panel"><div class="rule"></div><div class="eyebrow">DOSSIER D'INTERVENTION // 00${level.number === 7 ? 1 : 2}</div><h1>FRAG<span>QUENCE</span></h1><p id="intro">${level.briefing}</p><div class="features"><span>01 / 3 ARMES</span><span>02 / 3 MODULES</span><span>03 / 1 RELAIS</span><span>04 / SURVIE</span></div><button id="play">ENTRER DANS LE NOEUD &rarr;</button><div class="audio-controls"><label>PISTE LOCALE <input id="music-file" type="file" accept="audio/*" aria-label="Choisir une musique locale"></label><label>MUSIQUE <input id="music-volume" type="range" min="0" max="100" value="15" aria-label="Volume de la musique"></label><label>BRUITAGES <input id="effects-volume" type="range" min="0" max="100" value="50" aria-label="Volume des bruitages"></label></div><p class="controls">ZQSD (AZERTY) / WASD (QWERTY) : BOUGER &nbsp; MAJ : COURIR &nbsp; ESPACE : SAUTER &nbsp; CLIC : TIRER &nbsp; R : RECHARGER &nbsp; 1-3 : ARMES &nbsp; E : INTERAGIR &nbsp; ECHAP : PAUSE<br>Ordinateur avec souris et clavier requis.</p></div></div>
  <div id="result" class="hidden" role="dialog" aria-modal="true" aria-labelledby="result-title"><div class="result-panel"><div class="result-line"></div><div class="eyebrow" id="result-sector"></div><h2 id="result-title"></h2><p id="result-message"></p><button id="result-continue">CONTINUER &rarr;</button></div></div>
`;

const el = (id: string) => document.getElementById(id)!;
const canvas = el('game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;

const scene = new THREE.Scene();
const atmosphere = level.number === 8 ? '#1d171c' : '#07141b';
scene.background = new THREE.Color(atmosphere);
scene.fog = new THREE.FogExp2(atmosphere, 0.014);
const camera = new THREE.PerspectiveCamera(77, window.innerWidth / window.innerHeight, 0.08, 180);
camera.rotation.order = 'YXZ';
const start = world(level.spawn);
camera.position.set(start.x, 1.7, start.z);
scene.add(camera);
scene.add(new THREE.HemisphereLight('#92edfa', '#10252b', 1.65));
const sun = new THREE.DirectionalLight('#c9e3e7', 0.75);
sun.position.set(12, 20, 7);
scene.add(sun);

const mat = (color: string, emissive = '#000000', strength = 0) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.25, emissive, emissiveIntensity: strength });
const dark = mat('#0a2029');
const floorMat = mat('#25404a');
const altFloor = mat('#1b333e');
const wallMat = mat('#2b4853');
const panelMat = mat('#13313c');
const edgeMat = mat('#08767d', '#00ced2', 1.7);
const orange = mat('#ab4b25', '#ff762d', 1.2);
const red = mat('#9b2c31', '#ff3040', 1.2);
const glass = mat('#1b6a72', '#01f1e6', 1.5);
const white = mat('#a7bfc1');
const enemyArmor = mat('#34404a');
const enemyTrim = mat('#82939a');
const enemyShadow = mat('#131922');
const enemyEye = mat('#ff6340', '#ff3427', 2.4);
const enemySignal = mat('#3ee5d7', '#00d9c9', 1.8);
const enemyWarning = mat('#dd7e36', '#ef6b20', 1.5);
const gunMetal = mat('#40505a');
const gunGrip = mat('#18242e');
const gunHighlight = mat('#b7c7c9');
const gunCharge = mat('#55fff0', '#00f5e2', 2);
const gunHeat = mat('#ffbd73', '#ff802e', 2);
const relayIdle = mat('#774535', '#ff7637', 1.3);
const relayLive = mat('#54dcd3', '#00ffe4', 2);
const walls: THREE.Object3D[] = [];
const animated: { mesh: THREE.Object3D; base: number; speed: number }[] = [];
const pointLights: THREE.PointLight[] = [];

function box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function strut(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, thickness: number, material: THREE.Material) {
  const offset = to.clone().sub(from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, offset.length(), 5), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), offset.normalize());
  parent.add(mesh);
}

function lamp(x: number, z: number, color: string, intensity = 6) {
  const light = new THREE.PointLight(color, intensity, 17, 2);
  light.position.set(x, 3.3, z);
  scene.add(light);
  pointLights.push(light);
  box(scene, x, 4.2, z, 1.8, 0.08, 0.14, color === '#ff8241' ? orange : edgeMat);
}

for (let z = 0; z < HEIGHT; z++) {
  for (let x = 0; x < WIDTH; x++) {
    if (!tiles[z][x]) continue;
    const p = world({ x, z });
    box(scene, p.x, -0.18, p.z, SIZE, 0.34, SIZE, level.number === 8 && (x + z) % 3 === 0 ? gunMetal : (x + z) % 3 ? floorMat : altFloor);
    box(scene, p.x, 4.6, p.z, SIZE, 0.17, SIZE, dark);
    if ((x + z) % 4 === 0) box(scene, p.x, 0.008, p.z, SIZE - 0.22, 0.012, SIZE - 0.22, panelMat);
    if (x % 4 === 0 && z % 3 === 0) box(scene, p.x, 4.48, p.z, 1.5, 0.04, 0.09, glass);
    if ((x * 7 + z * 3) % 9 === 0) {
      box(scene, p.x, 0.012, p.z, 1.8, 0.018, 0.055, edgeMat);
      box(scene, p.x, 0.012, p.z, 0.055, 0.018, 1.8, edgeMat);
    }
    for (const [dx, dz, angle] of [[0, -1, 0], [0, 1, 0], [-1, 0, Math.PI / 2], [1, 0, Math.PI / 2]] as const) {
      if (tiles[z + dz]?.[x + dx]) continue;
      const w = box(scene, p.x + dx * SIZE / 2, 2.25, p.z + dz * SIZE / 2, SIZE, 4.5, 0.25, wallMat);
      w.rotation.y = angle;
      walls.push(w);
      const stripe = box(scene, p.x + dx * (SIZE / 2 - 0.15), 0.55, p.z + dz * (SIZE / 2 - 0.15), SIZE, 0.07, 0.1, (x + z) % (level.number === 8 ? 3 : 6) === 0 ? orange : edgeMat);
      stripe.rotation.y = angle;
      if ((x * 3 + z * 5) % 4 === 0) {
        const panel = box(scene, p.x + dx * (SIZE / 2 - 0.19), 2.45, p.z + dz * (SIZE / 2 - 0.19), 2.3, 1.2, 0.07, panelMat);
        panel.rotation.y = angle;
        const display = box(scene, p.x + dx * (SIZE / 2 - 0.24), 2.55, p.z + dz * (SIZE / 2 - 0.24), 1.55, 0.58, 0.075, dark);
        display.rotation.y = angle;
        for (let i = 0; i < 3; i++) {
          const status = box(scene, p.x + dx * (SIZE / 2 - 0.3), 2.74 - i * 0.16, p.z + dz * (SIZE / 2 - 0.3), 1.1 - i * 0.2, 0.035, 0.08, i === 0 ? orange : edgeMat);
          status.rotation.y = angle;
        }
      }
      if ((x + z) % 5 === 0) {
        const support = box(scene, p.x + dx * (SIZE / 2 - 0.17), 3.6, p.z + dz * (SIZE / 2 - 0.17), SIZE - 0.3, 0.12, 0.1, white);
        support.rotation.y = angle;
      }
    }
  }
}

const decorate = (points: Point[], color: THREE.Material) => {
  for (const position of points) {
    const p = world(position);
    box(scene, p.x, 1.15, p.z, 1.25, 2.3, 1.25, dark);
    box(scene, p.x, 2.36, p.z, 1.45, 0.16, 1.45, gunMetal);
    for (const side of [-0.57, 0.57]) box(scene, p.x + side, 1.18, p.z + 0.64, 0.08, 2.12, 0.08, gunHighlight);
    for (let i = 0; i < 4; i++) {
      const y = 0.48 + i * 0.45;
      box(scene, p.x, y, p.z + 0.635, 0.78, 0.07, 0.04, color);
      for (const side of [-0.36, -0.21, 0.21, 0.36]) box(scene, p.x + side, y + 0.17, p.z + 0.635, 0.055, 0.08, 0.05, side < 0 ? edgeMat : orange);
    }
  }
};
decorate(level.racks, glass);
for (const p of [level.spawn, ...level.lights, ...level.modules, level.relay]) {
  const pos = world(p);
  lamp(pos.x, pos.z, p === level.relay || level.number === 8 && p !== level.spawn && !level.modules.includes(p) ? '#ff8241' : '#00e5e1');
}
for (const p of level.markings) {
  const pos = world(p);
  box(scene, pos.x, 0.07, pos.z, 1.8, 0.1, 1.8, orange);
}
const relayPos = world(level.relay);
const logoFacingSouth = level.number === 8;
const logoMount = new THREE.Group();
logoMount.position.set(relayPos.x, 3.3, relayPos.z + (logoFacingSouth ? 3.5 : -3.5));
logoMount.rotation.y = logoFacingSouth ? 0 : Math.PI;
scene.add(logoMount);
box(logoMount, 0, 0, -0.06, 5.9, 2.2, 0.12, gunGrip);
for (const x of [-2.8, 2.8]) box(logoMount, x, 0, 0.02, 0.07, 2.07, 0.06, edgeMat);
for (const y of [-1, 1]) box(logoMount, 0, y, 0.02, 5.65, 0.07, 0.06, edgeMat);
for (const x of [-2.3, 2.3]) box(logoMount, x, 1.2, -0.04, 0.08, 0.35, 0.08, gunHighlight);
const logoCanvas = document.createElement('canvas');
logoCanvas.width = 1024;
logoCanvas.height = 400;
const logoContext = logoCanvas.getContext('2d')!;
function petal(x: number, y: number, angle: number, color: string) {
  logoContext.save();
  logoContext.translate(x, y);
  logoContext.rotate(angle);
  logoContext.fillStyle = color;
  logoContext.beginPath();
  logoContext.ellipse(0, 0, 90, 38, 0, 0, Math.PI * 2);
  logoContext.fill();
  logoContext.restore();
}
petal(459, 112, Math.PI / 3, '#0055a4');
petal(565, 112, -Math.PI / 3, '#ea5b0f');
petal(512, 56, 0, '#009dcc');
logoContext.textAlign = 'center';
logoContext.fillStyle = '#ffffff';
logoContext.font = 'bold 105px Arial, sans-serif';
logoContext.fillText('bouygues', 512, 300);
logoContext.fillStyle = '#79ddec';
logoContext.font = 'bold 43px Arial, sans-serif';
logoContext.fillText('T E L E C O M', 512, 364);
const logoTexture = new THREE.CanvasTexture(logoCanvas);
logoTexture.colorSpace = THREE.SRGBColorSpace;
const logo = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.12), new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
logo.position.z = 0.045;
logoMount.add(logo);
box(scene, relayPos.x, 0.22, relayPos.z, 3.6, 0.42, 3.6, gunMetal);
box(scene, relayPos.x, 0.48, relayPos.z, 2.7, 0.15, 2.7, gunGrip);
box(scene, relayPos.x, 0.75, relayPos.z, 1.68, 0.48, 1.68, gunMetal);
const relayRings: THREE.Mesh[] = [];
for (const size of [2.1, 3.05]) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(size / 2, 0.055, 4, 8), relayIdle);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(relayPos.x, 0.47, relayPos.z);
  scene.add(ring);
  relayRings.push(ring);
}
const relayCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), relayIdle);
relayCore.position.set(relayPos.x, 1.96, relayPos.z);
scene.add(relayCore);
const glowCanvas = document.createElement('canvas');
glowCanvas.width = glowCanvas.height = 128;
const glowContext = glowCanvas.getContext('2d')!;
const glowGradient = glowContext.createRadialGradient(64, 64, 8, 64, 64, 64);
glowGradient.addColorStop(0, 'rgba(255,255,255,0.8)');
glowGradient.addColorStop(0.25, 'rgba(255,255,255,0.45)');
glowGradient.addColorStop(1, 'rgba(255,255,255,0)');
glowContext.fillStyle = glowGradient;
glowContext.fillRect(0, 0, 128, 128);
const glowTexture = new THREE.CanvasTexture(glowCanvas);
const relayGlowMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: '#ff8241', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, toneMapped: false });
const relayGlow = new THREE.Sprite(relayGlowMaterial);
relayGlow.position.set(relayPos.x, 3.55, relayPos.z);
relayGlow.scale.set(5, 5, 1);
scene.add(relayGlow);
const beaconMaterial = new THREE.MeshBasicMaterial({ color: '#ffae5d', toneMapped: false, side: THREE.DoubleSide });
const relayBeacon = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.095, 6, 24), beaconMaterial);
relayBeacon.rotation.x = Math.PI / 2;
relayBeacon.position.set(relayPos.x, 3.48, relayPos.z);
scene.add(relayBeacon);
const relayLight = new THREE.PointLight('#ff8241', 9, 12, 2);
relayLight.position.copy(relayBeacon.position);
scene.add(relayLight);
const relayHalo = new THREE.Group();
relayHalo.position.set(relayPos.x, 1.96, relayPos.z);
scene.add(relayHalo);
for (const angle of [0, Math.PI / 2]) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.05, 4, 12), relayIdle);
  ring.rotation.y = angle;
  relayHalo.add(ring);
  relayRings.push(ring);
}
const relayIndicators: THREE.Mesh[] = [];
for (let i = 0; i < 3; i++) {
  const x = relayPos.x + (i - 1) * 0.42;
  box(scene, x, 0.88, relayPos.z + 0.86, 0.31, 0.23, 0.1, gunGrip);
  relayIndicators.push(box(scene, x, 0.89, relayPos.z + 0.92, 0.18, 0.1, 0.035, relayIdle));
}
for (const dx of [-1.13, 1.13]) for (const dz of [-1.13, 1.13]) {
  box(scene, relayPos.x + dx, 1.58, relayPos.z + dz, 0.17, 2.2, 0.17, gunHighlight);
  box(scene, relayPos.x + dx, 1.65, relayPos.z + dz, 0.23, 1.6, 0.23, beaconMaterial);
  box(scene, relayPos.x + dx, 2.54, relayPos.z + dz, 0.28, 0.25, 0.28, beaconMaterial);
  box(scene, relayPos.x + dx, 0.53, relayPos.z + dz, 0.32, 0.3, 0.32, gunGrip);
}
box(scene, relayPos.x, 2.72, relayPos.z, 2.6, 0.16, 0.16, gunMetal);
box(scene, relayPos.x, 2.72, relayPos.z, 0.16, 0.16, 2.6, gunMetal);

const enemies: Enemy[] = [];
const waveEnemies = new Set<Enemy>();
const pickups: Pickup[] = [];
const bolts: Bolt[] = [];
const tracers: Tracer[] = [];
const particles: Particle[] = [];
const moduleTaken = [false, false, false];
let hp = 100;
const capacity = [18, 6, 4];
const weaponNames = ['IMPULSION', 'FUSIL FIBRE', 'LANCE-PAQUETS'];
const reloadDuration = [1.2, 1.8, 2.2];
const magazine = [18, 6, 4];
const reserve = [72, 24, 8];
let weapon: Weapon = 0;
const acquired = [true, false, false];
let wave = false;
let won = false;
let finished = false;
let started = false;
let yaw = 0;
// Face the first exit in each level.
yaw = level.number === 8 ? 0 : -Math.PI / 2;
camera.rotation.y = yaw;
let pitch = 0;
let vy = 0;
let grounded = true;
let shootCooldown = 0;
let reloadRemaining = 0;
let flashRemaining = 0;
let playerHurt = 0;
let toastTimer = 0;
let shotsHeld = false;
let time = 0;
type Direction = 'forward' | 'backward' | 'left' | 'right';
const movement = new Map<string, Direction>();
const keys = new Set<string>();
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const aim = new THREE.Vector3();
const rayOrigin = new THREE.Vector3();

const gun = new THREE.Group();
camera.add(gun);
gun.position.set(0.48, -0.42, -0.75);
const gunModels = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
gunModels.forEach(model => gun.add(model));

// Compact pulse sidearm, with an exposed charge cell and squared-off muzzle.
const pistol = gunModels[0];
box(pistol, 0, 0, -0.3, 0.34, 0.31, 0.7, gunMetal);
box(pistol, 0, 0.19, -0.38, 0.28, 0.13, 0.56, gunHighlight);
box(pistol, 0, -0.27, -0.05, 0.19, 0.43, 0.22, gunGrip).rotation.x = -0.23;
box(pistol, 0, -0.13, -0.55, 0.26, 0.12, 0.28, gunGrip);
box(pistol, 0, 0.04, -0.76, 0.28, 0.25, 0.27, gunMetal);
box(pistol, 0, 0.04, -0.92, 0.13, 0.12, 0.04, gunCharge);
for (const x of [-0.18, 0.18]) {
  box(pistol, x, 0.04, -0.35, 0.06, 0.12, 0.51, gunGrip);
  box(pistol, x * 1.07, 0.05, -0.52, 0.025, 0.08, 0.13, gunCharge);
}
box(pistol, 0, 0.32, -0.62, 0.08, 0.12, 0.08, gunCharge);
const pistolCell = new THREE.Group();
pistolCell.position.set(0, -0.26, -0.05);
pistol.add(pistolCell);
box(pistolCell, 0, 0, 0, 0.14, 0.18, 0.18, gunCharge);

// Long fibre rifle: slim illuminated rail and a substantial rear power unit.
const rifle = gunModels[1];
box(rifle, 0, 0, -0.43, 0.42, 0.35, 0.89, gunMetal);
box(rifle, 0, -0.04, 0.24, 0.28, 0.27, 0.59, gunGrip);
box(rifle, 0, -0.28, 0.04, 0.21, 0.43, 0.23, gunGrip).rotation.x = -0.18;
box(rifle, 0, -0.22, -0.51, 0.23, 0.35, 0.31, gunHighlight);
box(rifle, 0, -0.22, -0.68, 0.15, 0.2, 0.05, gunCharge);
box(rifle, 0, 0.12, -1.1, 0.21, 0.19, 0.73, gunGrip);
box(rifle, 0, 0.12, -1.51, 0.29, 0.27, 0.19, gunMetal);
box(rifle, 0, 0.12, -1.62, 0.13, 0.12, 0.035, gunCharge);
for (const x of [-0.2, 0.2]) {
  box(rifle, x, 0.16, -0.79, 0.06, 0.12, 0.94, gunHighlight);
  box(rifle, x * 1.13, 0.17, -0.93, 0.025, 0.055, 0.6, gunCharge);
}
box(rifle, 0, 0.32, -0.39, 0.16, 0.3, 0.36, gunGrip);
box(rifle, 0, 0.49, -0.4, 0.07, 0.045, 0.21, gunCharge);
const rifleCell = new THREE.Group();
rifleCell.position.set(0, -0.34, -0.51);
rifle.add(rifleCell);
box(rifleCell, 0, 0, 0, 0.18, 0.28, 0.24, gunCharge);

// Heavy launcher: three separate launch tubes, rear canister and hazard markings.
const launcher = gunModels[2];
box(launcher, 0, -0.03, -0.36, 0.65, 0.46, 0.76, gunMetal);
box(launcher, 0, -0.37, -0.09, 0.28, 0.47, 0.3, gunGrip).rotation.x = -0.19;
box(launcher, 0, 0.31, -0.24, 0.48, 0.23, 0.34, gunGrip);
box(launcher, 0, 0.44, -0.22, 0.18, 0.055, 0.18, gunHeat);
for (const x of [-0.27, 0, 0.27]) {
  box(launcher, x, 0.02, -0.99, 0.25, 0.28, 0.92, gunGrip);
  box(launcher, x, 0.02, -1.46, 0.29, 0.33, 0.13, gunMetal);
  box(launcher, x, 0.02, -1.54, 0.14, 0.14, 0.04, gunHeat);
  box(launcher, x, 0.2, -0.97, 0.14, 0.035, 0.48, gunHeat);
}
box(launcher, 0, -0.3, -0.65, 0.58, 0.25, 0.46, gunHighlight);
for (const x of [-0.26, 0.26]) box(launcher, x, -0.34, -0.66, 0.06, 0.06, 0.36, gunHeat);
const launcherCell = new THREE.Group();
launcherCell.position.set(0, -0.42, -0.65);
launcher.add(launcherCell);
box(launcherCell, 0, 0, 0, 0.43, 0.14, 0.34, gunHeat);
const reloadCells = [pistolCell, rifleCell, launcherCell];

const flashCanvas = document.createElement('canvas');
flashCanvas.width = flashCanvas.height = 64;
const flashContext = flashCanvas.getContext('2d')!;
const gradient = flashContext.createRadialGradient(32, 32, 2, 32, 32, 31);
gradient.addColorStop(0, 'rgba(255,255,255,1)');
gradient.addColorStop(0.25, 'rgba(255,255,255,0.9)');
gradient.addColorStop(0.6, 'rgba(255,255,255,0.35)');
gradient.addColorStop(1, 'rgba(255,255,255,0)');
flashContext.fillStyle = gradient;
flashContext.fillRect(0, 0, 64, 64);
const flashMaterial = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(flashCanvas), color: '#43f6ed', transparent: true, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, toneMapped: false });
const muzzleFlash = new THREE.Sprite(flashMaterial);
muzzleFlash.visible = false;
muzzleFlash.scale.set(1.2, 1.2, 1);
gun.add(muzzleFlash);

function setWeapon(next: Weapon) {
  if (!acquired[next]) { toast('ARME NON TROUVEE'); return; }
  if (next !== weapon) reloadRemaining = 0;
  weapon = next;
  gunModels.forEach((model, index) => { model.visible = index === next; });
  muzzleFlash.position.set(0, next === 1 ? 0.12 : 0.04, [-0.9, -1.57, -1.5][next]);
  flashMaterial.color.set(next === 2 ? '#ffaf5c' : '#58fff2');
  flashRemaining = 0;
  muzzleFlash.visible = false;
  el('weapon').textContent = weaponNames[next];
  updateAmmo();
}

function updateAmmo() {
  el('ammo').textContent = `${magazine[weapon]} / ${reserve[weapon]}`;
  el('reload-hint').textContent = reloadRemaining > 0 ? 'RECHARGEMENT...' : magazine[weapon] < capacity[weapon] && reserve[weapon] > 0 ? 'R / RECHARGER' : '';
  for (let i = 0; i < weaponNames.length; i++) {
    const row = el(`weapon-slot-${i}`);
    row.classList.toggle('active', i === weapon);
    row.classList.toggle('locked', !acquired[i]);
    row.querySelector('.slot-status')!.textContent = acquired[i] ? `DISPONIBLE · ${magazine[i]} / ${reserve[i]}` : 'VERROUILLEE';
  }
}

function reload() {
  if (reloadRemaining > 0 || magazine[weapon] === capacity[weapon] || reserve[weapon] === 0) return;
  reloadRemaining = reloadDuration[weapon];
  sound('reload');
  updateAmmo();
}

function updateReload(dt: number) {
  if (reloadRemaining <= 0) return;
  reloadRemaining = Math.max(0, reloadRemaining - dt);
  if (reloadRemaining === 0) {
    const loaded = Math.min(capacity[weapon] - magazine[weapon], reserve[weapon]);
    magazine[weapon] += loaded;
    reserve[weapon] -= loaded;
    sound('reloadEnd');
    updateAmmo();
  }
}

function toast(message: string) {
  el('toast').textContent = message;
  el('toast').classList.add('visible');
  toastTimer = 3;
}

function updateObjective() {
  const count = moduleTaken.filter(Boolean).length;
  el('objective-text').innerHTML = won ? 'RESEAU RETABLI' : wave ? `DEFENDEZ LE RELAIS<br><strong>${waveEnemies.size} HOSTILES RESTANTS</strong>` : count === 3 ? 'MODULES RECUPERES<br><strong>ACTIVEZ LE RELAIS [E]</strong>' : `RECUPEREZ LES MODULES<br><strong>${count} / 3 SYNCHRONISES</strong>`;
}

el('weapon-list').innerHTML = weaponNames.map((name, i) => `<div class="weapon-slot" id="weapon-slot-${i}"><span class="slot-number">0${i + 1}</span><span>${name}</span><span class="slot-status"></span></div>`).join('');

function makePickup(point: Point, type: Pickup['type'], index?: number) {
  const p = world(point);
  const mesh = new THREE.Group();
  mesh.position.set(p.x, 0.9, p.z);
  scene.add(mesh);
  let glow: THREE.Sprite | undefined;
  if (type === 'module') {
    const frame = new THREE.Group();
    frame.rotation.z = 0.13;
    mesh.add(frame);
    box(frame, 0, -0.46, 0, 0.95, 0.18, 0.78, enemyShadow);
    box(frame, 0, -0.33, 0, 0.73, 0.08, 0.6, gunHighlight);
    for (const x of [-0.42, 0.42]) for (const z of [-0.32, 0.32]) {
      box(frame, x, 0.08, z, 0.09, 0.86, 0.09, gunMetal);
      box(frame, x, 0.53, z, 0.13, 0.1, 0.13, gunHeat);
    }
    box(frame, 0, 0.56, 0, 0.94, 0.1, 0.72, gunHighlight);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.33, 0), gunCharge);
    core.position.y = 0.12;
    frame.add(core);
    box(frame, 0, 0.13, 0.36, 0.46, 0.09, 0.04, gunHeat);
    for (const x of [-0.28, 0.28]) box(frame, x, 0.12, 0.35, 0.07, 0.4, 0.05, gunHighlight);
    glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: '#3bfff0', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, toneMapped: false }));
    glow.position.set(0, 0.18, 0);
    glow.scale.set(2.4, 2.4, 1);
    mesh.add(glow);
  } else {
    const trim = type === 'health' ? red : gunHeat;
    box(mesh, 0, 0, 0, 0.95, 0.62, 0.73, gunMetal);
    box(mesh, 0, 0.34, 0, 1.05, 0.12, 0.83, gunGrip);
    box(mesh, 0, 0.43, 0, 0.58, 0.06, 0.37, trim);
    for (const x of [-0.43, 0.43]) {
      box(mesh, x, 0.01, 0, 0.12, 0.66, 0.79, gunHighlight);
      box(mesh, x, 0.03, 0.39, 0.09, 0.28, 0.05, gunGrip);
    }
    for (const z of [-0.32, 0.32]) box(mesh, 0, -0.3, z, 0.7, 0.09, 0.09, gunGrip);
    box(mesh, 0, 0.04, 0.4, 0.52, 0.4, 0.05, gunGrip);
    if (type === 'health') {
      box(mesh, 0, 0.04, 0.44, 0.12, 0.3, 0.05, white);
      box(mesh, 0, 0.04, 0.45, 0.33, 0.1, 0.05, white);
    } else {
      for (const x of [-0.16, 0, 0.16]) {
        box(mesh, x, 0.02, 0.45, 0.1, 0.24, 0.06, gunHeat);
        box(mesh, x, 0.18, 0.45, 0.1, 0.05, 0.06, gunHighlight);
      }
    }
  }
  pickups.push({ mesh, type, index, phase: Math.random() * Math.PI * 2, glow });
}
level.modules.forEach((p, i) => makePickup(p, 'module', i));
for (const p of level.health) makePickup(p, 'health');
for (const p of level.ammo) makePickup(p, 'ammo');

function makeEnemy(point: Point, kind: Kind) {
  const p = world(point);
  const mesh = new THREE.Group();
  mesh.position.set(p.x, 0, p.z);
  scene.add(mesh);
  const moving = new THREE.Group();
  mesh.add(moving);
  if (kind === 'parasite') {
    const shell = box(mesh, 0, 0.67, -0.13, 1.04, 0.68, 1.2, enemyArmor);
    shell.rotation.x = -0.12;
    box(mesh, 0, 0.77, 0.43, 0.86, 0.43, 0.28, enemyShadow);
    for (const x of [-0.24, 0.24]) {
      box(mesh, x, 0.79, 0.59, 0.17, 0.12, 0.07, enemyEye);
      box(mesh, x * 1.5, 0.95, -0.1, 0.06, 0.05, 0.85, enemySignal);
    }
    for (const side of [-1, 1]) {
      for (const z of [-0.43, 0.36]) {
        strut(mesh, new THREE.Vector3(side * 0.43, 0.53, z), new THREE.Vector3(side * 0.84, 0.28, z + 0.14), 0.075, enemyTrim);
        strut(mesh, new THREE.Vector3(side * 0.84, 0.28, z + 0.14), new THREE.Vector3(side * 0.94, 0.05, z + 0.32), 0.065, enemyShadow);
      }
      const claw = box(moving, side * 0.4, 0.33, 0.65, 0.22, 0.2, 0.62, enemyArmor);
      claw.rotation.y = side * 0.35;
      box(moving, side * 0.53, 0.28, 0.96, 0.12, 0.09, 0.28, enemyEye);
    }
    for (let i = 0; i < 3; i++) {
      const spine = box(mesh, 0, 1.09, -0.5 + i * 0.33, 0.15, 0.27, 0.19, enemyTrim);
      spine.rotation.x = 0.4;
    }
  } else if (kind === 'drone') {
    const hull = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), enemyArmor);
    hull.position.y = 1.7;
    mesh.add(hull);
    box(mesh, 0, 1.71, 0.52, 0.77, 0.38, 0.18, enemyShadow);
    box(mesh, 0, 1.74, 0.63, 0.53, 0.13, 0.06, enemyEye);
    box(mesh, 0, 1.33, 0.08, 0.32, 0.18, 0.55, enemyTrim);
    box(mesh, 0, 1.25, 0.45, 0.15, 0.15, 0.38, enemyWarning);
    for (const side of [-1, 1]) {
      strut(mesh, new THREE.Vector3(side * 0.48, 1.72, 0), new THREE.Vector3(side * 1.2, 1.77, 0), 0.11, enemyTrim);
      box(mesh, side * 1.2, 1.69, 0, 0.52, 0.19, 0.52, enemyShadow);
      box(mesh, side * 1.2, 1.78, 0, 0.27, 0.06, 0.27, enemySignal);
      const rotor = new THREE.Group();
      rotor.position.set(side * 1.2, 1.86, 0);
      moving.add(rotor);
      box(rotor, 0, 0, 0, 0.98, 0.04, 0.13, enemyTrim);
      box(rotor, 0, 0, 0, 0.13, 0.04, 0.98, enemyTrim);
      box(mesh, side * 0.46, 1.36, 0.32, 0.16, 0.14, 0.35, enemyWarning);
    }
    for (const z of [-0.55, -0.72]) box(mesh, 0, 1.65, z, 0.3, 0.08, 0.07, enemySignal);
  } else {
    box(mesh, 0, 0.2, 0, 1.3, 0.38, 1.14, enemyShadow);
    for (const side of [-1, 1]) {
      box(mesh, side * 0.54, 0.52, 0, 0.33, 0.58, 1.05, enemyArmor);
      for (const z of [-0.37, 0, 0.37]) box(mesh, side * 0.73, 0.43, z, 0.04, 0.13, 0.18, enemyWarning);
    }
    box(mesh, 0, 1.5, 0, 0.95, 1.8, 0.77, enemyArmor);
    box(mesh, 0, 1.45, 0.43, 0.73, 1.16, 0.09, enemyShadow);
    for (let i = 0; i < 4; i++) box(mesh, 0, 1.04 + i * 0.27, 0.49, 0.52, 0.07, 0.04, i === 3 ? enemyEye : enemyWarning);
    box(mesh, 0, 2.32, 0.16, 0.82, 0.4, 0.64, enemyTrim);
    box(mesh, 0, 2.36, 0.51, 0.48, 0.15, 0.06, enemyEye);
    for (const side of [-1, 1]) {
      box(mesh, side * 0.37, 2.8, -0.13, 0.14, 0.65, 0.14, enemyShadow);
      box(mesh, side * 0.37, 3.18, -0.13, 0.23, 0.2, 0.23, enemyWarning);
      box(moving, side * 0.37, 3.42, -0.13, 0.06, 0.36, 0.06, enemySignal);
      strut(mesh, new THREE.Vector3(side * 0.48, 1.96, 0), new THREE.Vector3(side * 0.73, 2.49, -0.26), 0.065, enemyTrim);
    }
  }
  const enemy = { mesh, moving, kind, hp: kind === 'brouilleur' ? 130 : kind === 'drone' ? 66 : 48, speed: kind === 'brouilleur' ? 2.6 : kind === 'drone' ? 3.3 : 5, cooldown: 0.5 + Math.random(), flash: 0, radius: 0.48 };
  enemies.push(enemy);
  if (wave) waveEnemies.add(enemy);
  updateObjective();
}

for (const [point, kind] of level.enemies) makeEnemy(point, kind);
updateObjective();
setWeapon(0);

function lineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
  const delta = to.clone().sub(from);
  const distance = delta.length();
  raycaster.set(from, delta.normalize());
  raycaster.far = distance;
  return raycaster.intersectObjects(walls, false).length === 0;
}

function spark(pos: THREE.Vector3, color = '#ffaf61', count = 7, drift = new THREE.Vector3()) {
  for (let i = 0; i < count; i++) {
    const size = 0.06 + Math.random() * 0.12;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size * 2), new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false }));
    mesh.position.copy(pos);
    scene.add(mesh);
    const duration = 0.25 + Math.random() * 0.4;
    particles.push({ mesh, velocity: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 5, (Math.random() - 0.5) * 8).add(drift), life: duration, duration, gravity: 12 });
  }
}

function burst(pos: THREE.Vector3, color: string, size: number) {
  const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, toneMapped: false }));
  mesh.position.copy(pos);
  mesh.scale.set(size, size, 1);
  scene.add(mesh);
  particles.push({ mesh, velocity: new THREE.Vector3(), life: 0.22, duration: 0.22, gravity: 0 });
}

function traceShot(end: THREE.Vector3, type: Weapon) {
  camera.updateMatrixWorld(true);
  const start = muzzleFlash.getWorldPosition(new THREE.Vector3());
  const delta = end.clone().sub(start);
  const distance = delta.length();
  if (distance < 0.1) return;
  const length = Math.min(distance, type === 1 ? 1.6 : 0.8);
  const direction = delta.normalize();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(type === 1 ? 0.065 : 0.105, type === 1 ? 0.065 : 0.105, length, 6),
    new THREE.MeshBasicMaterial({ color: type === 1 ? '#aafff7' : '#54eee6', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  mesh.position.copy(start).addScaledVector(direction, length / 2);
  scene.add(mesh);
  tracers.push({ mesh, start: mesh.position.clone(), end: end.clone().addScaledVector(direction, -length / 2), elapsed: 0, duration: Math.max(0.12, distance / (type === 1 ? 180 : 105)) });
}

function updateTracers(dt: number) {
  for (const tracer of [...tracers]) {
    tracer.elapsed += dt;
    tracer.mesh.position.lerpVectors(tracer.start, tracer.end, Math.min(1, tracer.elapsed / tracer.duration));
    if (tracer.elapsed >= tracer.duration) {
      scene.remove(tracer.mesh);
      tracer.mesh.geometry.dispose();
      (tracer.mesh.material as THREE.Material).dispose();
      tracers.splice(tracers.indexOf(tracer), 1);
    }
  }
}

function hitEnemy(enemy: Enemy, damage: number) {
  enemy.hp -= damage;
  enemy.flash = 0.15;
  sound('impact');
  const hit = enemy.mesh.position.clone().add(new THREE.Vector3(0, enemy.kind === 'drone' ? 1.7 : enemy.kind === 'brouilleur' ? 1.6 : 0.8, 0));
  const knockback = camera.position.clone().sub(hit).setY(0).normalize().multiplyScalar(2);
  burst(hit.clone().addScaledVector(knockback, 0.6), '#fff2bd', 1.25);
  spark(hit, '#ff6c45', 9, knockback);
  spark(hit, '#ffd890', 4, knockback);
  if (enemy.hp <= 0) {
    spark(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), '#ff9d56', 15);
    scene.remove(enemy.mesh);
    enemies.splice(enemies.indexOf(enemy), 1);
    waveEnemies.delete(enemy);
    if (!wave && Math.random() < 0.27) makePickup(cell(enemy.mesh.position.x, enemy.mesh.position.z), Math.random() < 0.5 ? 'health' : 'ammo');
    updateObjective();
    if (wave && waveEnemies.size === 0) finish(true);
  }
}

function hurt(amount: number) {
  if (hp <= 0 || won) return;
  sound('hurt');
  hp = Math.max(0, hp - amount);
  playerHurt = 0.42;
  el('health').textContent = `${hp}`;
  el('damage').style.opacity = '0.27';
  if (!hp) finish(false);
}

function shoot() {
  if (shootCooldown > 0 || reloadRemaining > 0 || !started || won || hp <= 0 || document.pointerLockElement !== canvas) return;
  if (magazine[weapon] === 0) { sound('empty'); toast(reserve[weapon] > 0 ? 'CHARGEUR VIDE - APPUYEZ SUR R' : 'PLUS DE MUNITIONS'); shootCooldown = 0.4; return; }
  shootCooldown = [0.19, 0.7, 0.85][weapon];
  magazine[weapon]--;
  sound((['impulsion', 'fibre', 'paquets'] as const)[weapon]);
  updateAmmo();
  flashRemaining = 0.12;
  muzzleFlash.visible = true;
  gun.position.z = -0.55;
  camera.getWorldDirection(aim);
  rayOrigin.copy(camera.position);
  if (weapon === 2) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 0), new THREE.MeshBasicMaterial({ color: '#ff9f58' }));
    mesh.position.copy(rayOrigin).addScaledVector(aim, 0.95);
    scene.add(mesh);
    bolts.push({ mesh, velocity: aim.clone().multiplyScalar(27), life: 2, damage: 88 });
    return;
  }
  raycaster.set(rayOrigin, aim);
  raycaster.far = 95;
  const wallHit = raycaster.intersectObjects(walls, false)[0];
  let target: Enemy | undefined;
  let best = wallHit?.distance ?? 95;
  for (const enemy of enemies) {
    const center = enemy.mesh.position.clone().add(new THREE.Vector3(0, enemy.kind === 'drone' ? 1.7 : enemy.kind === 'brouilleur' ? 1.5 : 0.7, 0));
    const distance = aim.dot(center.sub(rayOrigin));
    const centerDistance = raycaster.ray.distanceSqToPoint(center.add(rayOrigin));
    if (distance > 0 && distance < best && centerDistance < (enemy.kind === 'brouilleur' ? 0.8 : 0.58) ** 2) {
      target = enemy;
      best = distance;
    }
  }
  if (target) hitEnemy(target, weapon === 1 ? 72 : 19);
  else if (wallHit) spark(wallHit.point, '#4ce9e2', 3);
  traceShot(rayOrigin.clone().addScaledVector(aim, best), weapon);
}

function explosion(pos: THREE.Vector3, damage: number) {
  sound('impact');
  spark(pos, '#ff9045', 25);
  for (const enemy of [...enemies]) {
    const d = enemy.mesh.position.distanceTo(pos);
    if (d < 5 && lineOfSight(pos, enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)))) hitEnemy(enemy, Math.round(damage * (1 - d / 6)));
  }
  const distance = camera.position.distanceTo(pos);
  if (distance < 3.8 && lineOfSight(pos, camera.position)) hurt(Math.round(22 * (1 - distance / 4)));
}

function updateBolts(dt: number) {
  for (const bolt of [...bolts]) {
    if (bolt.damage < 0) continue;
    const previous = bolt.mesh.position.clone();
    bolt.mesh.position.addScaledVector(bolt.velocity, dt);
    bolt.life -= dt;
    const direction = bolt.velocity.clone().normalize();
    raycaster.set(previous, direction);
    raycaster.far = previous.distanceTo(bolt.mesh.position);
    const wallHit = raycaster.intersectObjects(walls, false)[0];
    const target = enemies.find(e => e.mesh.position.distanceTo(bolt.mesh.position) < 0.85 && Math.abs(e.mesh.position.y + 1.2 - bolt.mesh.position.y) < 2);
    if (wallHit || target || bolt.life <= 0) {
      if (wallHit) bolt.mesh.position.copy(wallHit.point);
      explosion(bolt.mesh.position, bolt.damage);
      scene.remove(bolt.mesh);
      bolt.mesh.geometry.dispose();
      (bolt.mesh.material as THREE.Material).dispose();
      bolts.splice(bolts.indexOf(bolt), 1);
    }
  }
}

function nextStep(from: Point, to: Point): Point | null {
  if (from.x === to.x && from.z === to.z) return null;
  if (!tiles[from.z]?.[from.x] || !tiles[to.z]?.[to.x]) return null;
  const queue = [to];
  const visited = new Set([`${to.x},${to.z}`]);
  const routes = new Map<string, Point>();
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const n of [{ x: p.x + 1, z: p.z }, { x: p.x - 1, z: p.z }, { x: p.x, z: p.z + 1 }, { x: p.x, z: p.z - 1 }]) {
      const id = `${n.x},${n.z}`;
      if (!tiles[n.z]?.[n.x] || visited.has(id)) continue;
      routes.set(id, p);
      if (n.x === from.x && n.z === from.z) return p;
      visited.add(id);
      queue.push(n);
    }
  }
  return null;
}

let navTimer = 0;
const paths = new Map<Enemy, Point | null>();
function updateEnemies(dt: number) {
  navTimer -= dt;
  if (navTimer <= 0) {
    navTimer = 0.45;
    for (const e of enemies) paths.set(e, nextStep(cell(e.mesh.position.x, e.mesh.position.z), cell(camera.position.x, camera.position.z)));
  }
  for (const e of enemies) {
    e.cooldown -= dt;
    e.flash = Math.max(0, e.flash - dt);
    const pos = e.mesh.position;
    const dist = Math.hypot(pos.x - camera.position.x, pos.z - camera.position.z);
    const from = pos.clone().add(new THREE.Vector3(0, 1.3, 0));
    const canSee = dist < 27 && lineOfSight(from, camera.position);
    const step = paths.get(e);
    if (dist < 38 && (!canSee || dist > (e.kind === 'parasite' ? 1.45 : e.kind === 'drone' ? 8 : 5)) && (step || canSee)) {
      const destination = canSee ? camera.position : new THREE.Vector3(world(step!).x, 0, world(step!).z);
      const dx = destination.x - pos.x;
      const dz = destination.z - pos.z;
      const length = Math.hypot(dx, dz) || 1;
      const nx = pos.x + dx / length * dt * e.speed;
      const nz = pos.z + dz / length * dt * e.speed;
      if (walkable(nx, pos.z, e.radius)) pos.x = nx;
      if (walkable(pos.x, nz, e.radius)) pos.z = nz;
    }
    e.mesh.rotation.y = Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z);
    if (e.kind === 'drone') {
      pos.y = Math.sin(time * 3 + pos.x) * 0.2;
      for (const rotor of e.moving.children) rotor.rotation.y += dt * 21;
    } else if (e.kind === 'parasite') {
      pos.y = dist < 12 ? Math.max(0, Math.sin(time * 7 + pos.z) * 0.14) : 0;
      e.moving.rotation.x = Math.sin(time * 11 + pos.z) * 0.13;
    } else {
      e.moving.rotation.y = Math.sin(time * 2 + pos.x) * 0.13;
    }
    if (canSee && e.cooldown <= 0) {
      if (e.kind === 'parasite' && dist < 2) { hurt(11); e.cooldown = 1.0; }
      else if (e.kind !== 'parasite' && dist < 21) {
        const isJammer = e.kind === 'brouilleur';
        const boltColor = isJammer ? '#ff9c47' : '#ff405c';
        const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(isJammer ? 0.24 : 0.17, 0), new THREE.MeshBasicMaterial({ color: boltColor, toneMapped: false }));
        mesh.position.copy(from);
        const direction = camera.position.clone().sub(from).normalize();
        const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: boltColor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, toneMapped: false }));
        aura.scale.setScalar(isJammer ? 1.15 : 0.8);
        mesh.add(aura);
        const tail = new THREE.Mesh(new THREE.ConeGeometry(isJammer ? 0.16 : 0.11, 0.65, 5), new THREE.MeshBasicMaterial({ color: boltColor, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        tail.position.copy(direction).multiplyScalar(-0.34);
        tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        mesh.add(tail);
        scene.add(mesh);
        bolts.push({ mesh, velocity: direction.multiplyScalar(isJammer ? 11 : 17), life: 3, damage: isJammer ? -17 : -9, trail: 0 });
        sound('enemy');
        e.cooldown = isJammer ? 2.5 : 1.3;
      }
    }
  }
}

function updateProjectiles(dt: number) {
  for (const bolt of [...bolts]) {
    if (bolt.damage > 0) continue;
    const previous = bolt.mesh.position.clone();
    bolt.mesh.position.addScaledVector(bolt.velocity, dt);
    bolt.life -= dt;
    raycaster.set(previous, bolt.velocity.clone().normalize());
    raycaster.far = previous.distanceTo(bolt.mesh.position);
    const wallHit = raycaster.intersectObjects(walls, false)[0];
    const hit = bolt.mesh.position.distanceTo(camera.position) < 0.67;
    bolt.trail = (bolt.trail ?? 0) - dt;
    if (bolt.trail <= 0 && !wallHit && !hit) {
      burst(previous, bolt.damage === -17 ? '#ff9c47' : '#ff405c', bolt.damage === -17 ? 0.45 : 0.32);
      bolt.trail = 0.07;
    }
    if (wallHit || hit || bolt.life <= 0) {
      if (wallHit) bolt.mesh.position.copy(wallHit.point);
      if (hit && !wallHit) hurt(-bolt.damage);
      if (bolt.damage === -17 && hit && !wallHit) toast('SIGNAL BROUILLE');
      if (!hit || wallHit) sound('impact');
      burst(bolt.mesh.position, bolt.damage === -17 ? '#ffb45f' : '#ff6a78', 1.1);
      spark(bolt.mesh.position, bolt.damage === -17 ? '#ff9c47' : '#ff405c', 6);
      bolt.mesh.traverse(child => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
        if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) (child.material as THREE.Material).dispose();
      });
      scene.remove(bolt.mesh);
      bolts.splice(bolts.indexOf(bolt), 1);
    }
  }
}

function updatePickups(dt: number) {
  for (const item of [...pickups]) {
    item.mesh.rotation.y += dt * 1.5;
    item.mesh.position.y = 0.9 + Math.sin(time * 3 + item.phase) * 0.18;
    if (item.glow) {
      const size = 2.4 + Math.sin(time * 3 + item.phase) * 0.3;
      item.glow.scale.set(size, size, 1);
    }
    if (item.mesh.position.distanceTo(camera.position.clone().setY(item.mesh.position.y)) > 1.6) continue;
    if (item.type === 'health' && hp >= 100) continue;
    if (item.type === 'module') {
      moduleTaken[item.index!] = true;
      relayIndicators[item.index!].material = relayLive;
      toast(`MODULE ${['A', 'B', 'C'][item.index!]} SYNCHRONISE`);
      if (item.index === 0) { acquired[1] = true; reserve[1] += 12; setWeapon(1); }
      if (item.index === 1) { acquired[2] = true; reserve[2] += 6; setWeapon(2); }
    } else if (item.type === 'health') {
      hp = Math.min(100, hp + 30);
      el('health').textContent = `${hp}`;
      toast('INTEGRITE RESTAUREE +30');
    } else {
      acquired[1] = true;
      reserve[0] += 30;
      reserve[1] += 12;
      reserve[2] += 4;
      toast('MUNITIONS +30 / +12 / +4');
    }
    sound('pickup');
    updateAmmo();
    spark(item.mesh.position, '#36e8e5', 8);
    scene.remove(item.mesh);
    item.glow?.material.dispose();
    pickups.splice(pickups.indexOf(item), 1);
    updateObjective();
  }
}

function interact() {
  if (wave || won || moduleTaken.some(t => !t)) return;
  if (Math.hypot(camera.position.x - relayPos.x, camera.position.z - relayPos.z) > 4.5) return;
  wave = true;
  sound('relay');
  relayCore.material = relayLive;
  relayRings.forEach(ring => { ring.material = relayLive; });
  relayGlowMaterial.color.set('#38fff0');
  beaconMaterial.color.set('#9dfff4');
  relayLight.color.set('#38fff0');
  toast('RELAIS ACTIF - DEFENDEZ LE NOEUD !');
  for (const [p, kind] of level.wave) makeEnemy(p, kind);
  updateObjective();
}

function finish(success: boolean) {
  if (finished) return;
  finished = true;
  won = success;
  shotsHeld = false;
  pauseAudio();
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  el('hud').classList.remove('active');
  el('overlay').classList.add('hidden');
  el('result').classList.remove('hidden');
  el('result').classList.toggle('victory', success);
  el('result-sector').textContent = `${level.name} // ${success ? 'RECONNEXION REUSSIE' : 'SIGNAL PERDU'}`;
  el('result-title').textContent = success ? 'VICTOIRE' : 'DEFAITE';
  el('result-message').textContent = success ? 'Le relais est retabli. Le reseau est de nouveau operationnel.' : 'Votre integrite est tombee a zero. Le relais attend une nouvelle intervention.';
  el('intro').textContent = success ? level.number === 7 ? 'Le Noeud 07 est retabli. Le centre de transit du Noeud 08 appelle a l aide : poursuivez l intervention.' : 'Le Noeud 08 est retabli. Les deux secteurs sont reconnectes : mission accomplie.' : `Le ${level.name} est perdu. Reprenez l intervention et retentez la reconnexion.`;
  el('play').textContent = success && level.number === 7 ? 'NIVEAU SUIVANT : NOEUD 08 →' : 'RECOMMENCER LA MISSION →';
  el('result-continue').focus();
  updateObjective();
}

const mapCanvas = el('minimap') as HTMLCanvasElement;
const map = mapCanvas.getContext('2d')!;
function renderMap() {
  const sx = mapCanvas.width / WIDTH;
  const sz = mapCanvas.height / HEIGHT;
  const jammed = enemies.some(e => e.kind === 'brouilleur' && e.mesh.position.distanceTo(camera.position) < 13);
  map.fillStyle = '#081921';
  map.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
  for (let z = 0; z < HEIGHT; z++) for (let x = 0; x < WIDTH; x++) if (tiles[z][x]) {
    map.fillStyle = (x + z) % 3 === 0 ? '#20424b' : '#17353d';
    map.fillRect(x * sx + 1, z * sz + 1, sx - 1, sz - 1);
  }
  for (const item of pickups) {
    if (item.type !== 'module') continue;
    const p = cell(item.mesh.position.x, item.mesh.position.z);
    map.fillStyle = '#ffaf6a';
    map.fillRect((p.x + 0.3) * sx, (p.z + 0.3) * sz, sx * 0.5, sz * 0.5);
  }
  const r = level.relay;
  map.strokeStyle = wave ? '#25fff2' : '#ff9a5c';
  map.lineWidth = 2;
  map.strokeRect((r.x + 0.1) * sx, (r.z + 0.1) * sz, sx * 0.8, sz * 0.8);
  if (!jammed) for (const e of enemies) {
    if (e.mesh.position.distanceTo(camera.position) > 17) continue;
    const p = cell(e.mesh.position.x, e.mesh.position.z);
    map.fillStyle = '#ff4050';
    map.beginPath(); map.arc((p.x + 0.5) * sx, (p.z + 0.5) * sz, 3, 0, Math.PI * 2); map.fill();
  }
  map.save();
  map.translate((camera.position.x / SIZE + WIDTH / 2) * sx, (camera.position.z / SIZE + HEIGHT / 2) * sz);
  map.rotate(-yaw);
  map.fillStyle = '#efffff';
  map.beginPath(); map.moveTo(0, -8); map.lineTo(5, 5); map.lineTo(-5, 5); map.closePath(); map.fill();
  map.restore();
  if (jammed) { map.fillStyle = '#ff894899'; map.fillRect(0, 0, mapCanvas.width, 4); }
}

function updatePlayer(dt: number) {
  const directions = new Set(movement.values());
  const forward = Number(directions.has('forward')) - Number(directions.has('backward'));
  const sideways = Number(directions.has('right')) - Number(directions.has('left'));
  const length = Math.hypot(forward, sideways) || 1;
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 11 : 7.2;
  const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * sideways) / length * speed * dt;
  const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * sideways) / length * speed * dt;
  if (walkable(camera.position.x + dx, camera.position.z, 0.43)) camera.position.x += dx;
  if (walkable(camera.position.x, camera.position.z + dz, 0.43)) camera.position.z += dz;
  if (grounded && keys.has('Space')) { vy = 8; grounded = false; }
  vy -= 22 * dt;
  camera.position.y += vy * dt;
  if (camera.position.y <= 1.7) { camera.position.y = 1.7; vy = 0; grounded = true; }
  const reloadProgress = reloadRemaining > 0 ? 1 - reloadRemaining / reloadDuration[weapon] : 0;
  const reloadDip = reloadRemaining > 0 ? Math.sin(Math.PI * reloadProgress) : 0;
  gun.position.x = 0.48 + Math.sin(time * 11) * 0.014 * (Math.abs(forward) + Math.abs(sideways));
  gun.position.y = -0.42 + Math.cos(time * 11) * 0.012 * (Math.abs(forward) + Math.abs(sideways)) - reloadDip * 0.32;
  gun.position.z = THREE.MathUtils.lerp(gun.position.z, -0.75 + reloadDip * 0.22, Math.min(1, dt * 13));
  gun.rotation.z = reloadDip * -0.35;
  reloadCells.forEach((cell, index) => { cell.position.y = [-0.26, -0.34, -0.42][index] - (index === weapon ? reloadDip * 0.24 : 0); });
  flashRemaining = Math.max(0, flashRemaining - dt);
  muzzleFlash.visible = flashRemaining > 0;
  if (muzzleFlash.visible) {
    const size = [1.15, 1.4, 1.7][weapon] * (0.8 + flashRemaining / 0.12 * 0.2);
    muzzleFlash.scale.set(size, size, 1);
  }
  const nearRelay = Math.hypot(camera.position.x - relayPos.x, camera.position.z - relayPos.z) < 4.5;
  el('prompt').textContent = nearRelay && !wave && moduleTaken.every(Boolean) ? '[ E ] ACTIVER LE RELAIS' : nearRelay && !wave ? '3 MODULES NECESSAIRES' : '';
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (started && !won && hp > 0 && document.pointerLockElement === canvas) {
    time += dt;
    shootCooldown = Math.max(0, shootCooldown - dt);
    updateReload(dt);
    if (shotsHeld) shoot();
    updatePlayer(dt);
    updateEnemies(dt);
    updateBolts(dt);
    updateProjectiles(dt);
    updateTracers(dt);
    updatePickups(dt);
    for (const effect of [...particles]) {
      effect.life -= dt;
      effect.mesh.position.addScaledVector(effect.velocity, dt);
      effect.velocity.y -= dt * effect.gravity;
      (effect.mesh.material as THREE.MeshBasicMaterial | THREE.SpriteMaterial).opacity = Math.max(0, effect.life / effect.duration);
      if (effect.life <= 0) {
        scene.remove(effect.mesh);
        if (effect.mesh instanceof THREE.Mesh) effect.mesh.geometry.dispose();
        (effect.mesh.material as THREE.Material).dispose();
        particles.splice(particles.indexOf(effect), 1);
      }
    }
    for (const obj of animated) obj.mesh.position.y = obj.base + Math.sin(time * obj.speed * 3) * 0.12;
    relayCore.position.y = 1.96 + Math.sin(time * 2.4) * 0.12;
    relayCore.rotation.y = time * (wave ? 1.8 : 0.6);
    const pulse = 0.5 + 0.5 * Math.sin(time * (wave ? 5 : 3));
    relayGlowMaterial.opacity = 0.75 + pulse * 0.2;
    relayGlow.scale.setScalar((wave ? 5.8 : 5) + pulse * 0.7);
    relayBeacon.scale.setScalar(1 + pulse * 0.16);
    relayLight.intensity = (wave ? 18 : 13) + pulse * 5;
    relayHalo.position.y = relayCore.position.y;
    relayHalo.rotation.y = time * (wave ? -1.2 : -0.4);
    toastTimer -= dt;
    if (toastTimer <= 0) el('toast').classList.remove('visible');
    playerHurt = Math.max(0, playerHurt - dt);
    el('damage').style.opacity = `${playerHurt * 0.5}`;
    renderMap();
  }
  renderer.render(scene, camera);
}
animate();

el('result-continue').addEventListener('click', () => {
  el('result').classList.add('hidden');
  el('overlay').classList.remove('hidden');
  el('play').focus();
});
el('play').addEventListener('click', () => {
  if (won && level.number === 7) { window.location.search = '?level=2'; return; }
  if (hp <= 0 || won) { window.location.reload(); return; }
  startAudio();
  canvas.requestPointerLock();
});
el('music-file').addEventListener('change', event => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) selectMusic(file);
});
for (const [id, channel] of [['music-volume', 'music'], ['effects-volume', 'effects']] as const) {
  el(id).addEventListener('input', event => setVolume(channel, Number((event.target as HTMLInputElement).value) / 100));
}
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (locked) {
    started = true;
    el('hud').classList.add('active');
    el('overlay').classList.add('hidden');
    startAudio();
  } else {
    pauseAudio();
    shotsHeld = false;
    movement.clear();
    keys.clear();
    if (!won && hp > 0 && started) {
      el('overlay').classList.remove('hidden');
      el('intro').textContent = 'Mission en pause. Le reseau attend toujours ses modules. Reprenez l intervention.';
      el('play').textContent = 'REPRENDRE LA MISSION →';
    }
  }
});
document.addEventListener('pointerlockerror', () => { pauseAudio(); toast('SOURIS INDISPONIBLE - AUTORISEZ LA CAPTURE'); });
document.addEventListener('mousemove', event => {
  if (document.pointerLockElement !== canvas) return;
  yaw -= event.movementX * 0.0023;
  pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.0023, -1.35, 1.35);
  camera.rotation.set(pitch, yaw, 0);
});
document.addEventListener('keydown', event => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  const key = event.key.toLowerCase();
  const direction: Direction | undefined =
    key === 'z' || key === 'w' || event.code === 'ArrowUp' ? 'forward' :
    key === 's' || event.code === 'ArrowDown' ? 'backward' :
    key === 'q' || key === 'a' || event.code === 'ArrowLeft' ? 'left' :
    key === 'd' || event.code === 'ArrowRight' ? 'right' : undefined;
  if (direction) movement.set(event.code, direction);
  if (document.pointerLockElement !== canvas || event.repeat) return;
  const weaponKey = event.code.match(/^(?:Digit|Numpad)([123])$/);
  if (weaponKey) setWeapon((Number(weaponKey[1]) - 1) as Weapon);
  if (event.code === 'KeyR' || key === 'r') reload();
  if (key === 'e') interact();
});
document.addEventListener('keyup', event => { keys.delete(event.code); movement.delete(event.code); });
window.addEventListener('blur', () => { keys.clear(); movement.clear(); shotsHeld = false; });
canvas.addEventListener('mousedown', event => { if (event.button === 0) { shotsHeld = true; shoot(); } });
document.addEventListener('mouseup', event => { if (event.button === 0) shotsHeld = false; });
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  if (document.pointerLockElement !== canvas) return;
  for (let i = 1; i <= 3; i++) {
    const next = ((weapon + (event.deltaY > 0 ? i : -i) + 6) % 3) as Weapon;
    if (acquired[next]) { setWeapon(next); break; }
  }
}, { passive: false });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
