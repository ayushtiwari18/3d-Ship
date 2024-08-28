// Import statements (assuming you're using a module bundler like webpack)
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let scene, camera, renderer, water, sun, sky;
let ship, submarine, titanicWreck;
let marineLife = [];
let exploring = false;

const loader = new GLTFLoader();

// Constants
const MAX_DEPTH = -3850;
const MIN_DEPTH = 0;
const DARK_DEPTH = -3500;

function init() {
  // Scene setup
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  sun = new THREE.Vector3();

  // Sky
  sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms["turbidity"].value = 10;
  skyUniforms["rayleigh"].value = 2;
  skyUniforms["mieCoefficient"].value = 0.005;
  skyUniforms["mieDirectionalG"].value = 0.8;

  const parameters = {
    elevation: 2,
    azimuth: 180,
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms["sunPosition"].value.copy(sun);
    water.material.uniforms["sunDirection"].value.copy(sun).normalize();
    scene.environment = pmremGenerator.fromScene(sky).texture;
  }

  updateSun();

  // Water
  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(
      "textures/waternormals.jpg",
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    ),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
    fog: scene.fog !== undefined,
  });
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  // Load models
  loadShip();
  loadSubmarine();
  loadTitanicWreck();

  addMarineLife();

  // Event listeners
  window.addEventListener("resize", onWindowResize, false);
  document.addEventListener("keydown", onKeyDown, false);
  document.addEventListener("keyup", onKeyUp, false);
  document.addEventListener("mousedown", onMouseDown, false);
  document.addEventListener("mouseup", onMouseUp, false);
  document.addEventListener("mousemove", onMouseMove, false);
  document
    .getElementById("explore-button")
    .addEventListener("click", startExploration);

  // Initial camera position
  camera.position.set(0, 20, 100);
  camera.lookAt(0, 0, 0);
}

function loadShip() {
  loader.load("models/ship.glb", (gltf) => {
    ship = gltf.scene;
    ship.scale.set(5, 5, 5);
    ship.position.set(0, 0, 0);
    scene.add(ship);
  });
}

function loadSubmarine() {
  loader.load("models/submarine.glb", (gltf) => {
    submarine = gltf.scene;
    submarine.scale.set(2, 2, 2);
    submarine.position.set(0, -10, 0);
    submarine.visible = false;
    scene.add(submarine);

    // Add spotlights to submarine
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 0, 5);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.1;
    spotLight.decay = 2;
    spotLight.distance = 200;
    submarine.add(spotLight);
  });
}

function loadTitanicWreck() {
  loader.load("models/titanic_wreck.glb", (gltf) => {
    titanicWreck = gltf.scene;
    titanicWreck.scale.set(10, 10, 10);
    titanicWreck.position.set(0, MAX_DEPTH + 50, -500);
    titanicWreck.rotation.y = Math.PI / 4;
    scene.add(titanicWreck);
  });
}

function addMarineLife() {
  const fishGeometry = new THREE.SphereGeometry(1, 32, 32);
  const sharkGeometry = new THREE.ConeGeometry(2, 10, 32);
  const jellyfishGeometry = new THREE.SphereGeometry(1.5, 32, 16);
  const whaleGeometry = new THREE.CapsuleGeometry(5, 20, 4, 8);

  const fishMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
  const sharkMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
  const jellyfishMaterial = new THREE.MeshPhongMaterial({
    color: 0xff69b4,
    transparent: true,
    opacity: 0.7,
  });
  const whaleMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });

  // Add fish
  for (let i = 0; i < 1000; i++) {
    const fish = new THREE.Mesh(fishGeometry, fishMaterial);
    fish.position.set(
      Math.random() * 2000 - 1000,
      Math.random() * (MIN_DEPTH - MAX_DEPTH) + MAX_DEPTH,
      Math.random() * 2000 - 1000
    );
    fish.userData = { type: "fish", speed: 0.2 };
    scene.add(fish);
    marineLife.push(fish);
  }

  // Add sharks
  for (let i = 0; i < 50; i++) {
    const shark = new THREE.Mesh(sharkGeometry, sharkMaterial);
    shark.position.set(
      Math.random() * 2000 - 1000,
      Math.random() * (-1000 - -3000) - 3000,
      Math.random() * 2000 - 1000
    );
    shark.userData = { type: "shark", speed: 0.5 };
    scene.add(shark);
    marineLife.push(shark);
  }

  // Add jellyfish
  for (let i = 0; i < 500; i++) {
    const jellyfish = new THREE.Mesh(jellyfishGeometry, jellyfishMaterial);
    jellyfish.position.set(
      Math.random() * 2000 - 1000,
      Math.random() * (-100 - -3500) - 3500,
      Math.random() * 2000 - 1000
    );
    jellyfish.userData = { type: "jellyfish", speed: 0.1 };
    scene.add(jellyfish);
    marineLife.push(jellyfish);
  }

  // Add whales
  for (let i = 0; i < 10; i++) {
    const whale = new THREE.Mesh(whaleGeometry, whaleMaterial);
    whale.position.set(
      Math.random() * 2000 - 1000,
      Math.random() * (-500 - -2000) - 2000,
      Math.random() * 2000 - 1000
    );
    whale.userData = { type: "whale", speed: 0.3 };
    scene.add(whale);
    marineLife.push(whale);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

let moveForward = false,
  moveBackward = false,
  moveLeft = false,
  moveRight = false,
  moveUp = false,
  moveDown = false;

function onKeyDown(event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      moveForward = true;
      break;
    case "ArrowDown":
    case "KeyS":
      moveBackward = true;
      break;
    case "ArrowLeft":
    case "KeyA":
      moveLeft = true;
      break;
    case "ArrowRight":
    case "KeyD":
      moveRight = true;
      break;
    case "Space":
      moveUp = true;
      break;
    case "ShiftLeft":
      moveDown = true;
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      moveForward = false;
      break;
    case "ArrowDown":
    case "KeyS":
      moveBackward = false;
      break;
    case "ArrowLeft":
    case "KeyA":
      moveLeft = false;
      break;
    case "ArrowRight":
    case "KeyD":
      moveRight = false;
      break;
    case "Space":
      moveUp = false;
      break;
    case "ShiftLeft":
      moveDown = false;
      break;
  }
}

let isDragging = false;
let previousMousePosition = {
  x: 0,
  y: 0,
};

function onMouseDown(event) {
  isDragging = true;
  previousMousePosition = {
    x: event.clientX,
    y: event.clientY,
  };
}

function onMouseUp() {
  isDragging = false;
}

function onMouseMove(event) {
  if (!isDragging || !exploring) return;

  const deltaMove = {
    x: event.clientX - previousMousePosition.x,
    y: event.clientY - previousMousePosition.y,
  };

  if (submarine) {
    submarine.rotation.y -= deltaMove.x * 0.01;
    submarine.rotation.x -= deltaMove.y * 0.01;

    submarine.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, submarine.rotation.x)
    );
  }

  previousMousePosition = {
    x: event.clientX,
    y: event.clientY,
  };
}

function startExploration() {
  exploring = true;
  if (submarine) {
    submarine.visible = true;
    submarine.position.set(0, -10, 0);
  }
  if (ship) {
    ship.visible = false;
  }
  camera.position.set(0, 0, 30);
  scene.fog = new THREE.FogExp2(0x000033, 0.00075);

  // Update UI
  document.getElementById("explore-button").style.display = "none";
  document.getElementById("depth-indicator").style.display = "block";
}

function updateEnvironment() {
  if (!submarine) return;

  const depth = -submarine.position.y;
  let fogDensity, ambientIntensity;

  if (depth > DARK_DEPTH) {
    const t = (depth - DARK_DEPTH) / (MAX_DEPTH - DARK_DEPTH);
    fogDensity = 0.00075 + t * 0.00125;
    ambientIntensity = 0.1 * (1 - t);
  } else {
    fogDensity = 0.00075;
    ambientIntensity = 0.1;
  }

  if (scene.fog) {
    scene.fog.density = fogDensity;
  }

  scene.traverse((child) => {
    if (child instanceof THREE.AmbientLight) {
      child.intensity = ambientIntensity;
    }
  });

  // Update depth indicator
  document.getElementById("depth-value").textContent = depth.toFixed(2);
}

function animate() {
  requestAnimationFrame(animate);

  if (exploring && submarine) {
    const speed = 1;
    const direction = new THREE.Vector3();
    submarine.getWorldDirection(direction);

    if (moveForward) submarine.position.add(direction.multiplyScalar(speed));
    if (moveBackward) submarine.position.add(direction.multiplyScalar(-speed));
    if (moveLeft)
      submarine.position.add(
        new THREE.Vector3(-direction.z, 0, direction.x)
          .normalize()
          .multiplyScalar(speed)
      );
    if (moveRight)
      submarine.position.add(
        new THREE.Vector3(direction.z, 0, -direction.x)
          .normalize()
          .multiplyScalar(speed)
      );
    if (moveUp) submarine.position.y += speed;
    if (moveDown) submarine.position.y -= speed;

    submarine.position.y = Math.max(
      Math.min(submarine.position.y, MIN_DEPTH),
      MAX_DEPTH
    );

    camera.position
      .copy(submarine.position)
      .add(new THREE.Vector3(0, 5, 30).applyQuaternion(submarine.quaternion));
    camera.lookAt(submarine.position);

    updateEnvironment();
  } else if (ship) {
    ship.position.y = Math.sin(Date.now() * 0.001) * 0.5;
    water.material.uniforms["time"].value += 1.0 / 60.0;
  }

  // Animate marine life
  marineLife.forEach((life) => {
    life.position.x += (Math.random() - 0.5) * life.userData.speed;
    life.position.y += (Math.random() - 0.5) * life.userData.speed;
    life.position.z += (Math.random() - 0.5) * life.userData.speed;

    // Wrap positions
    life.position.x = ((life.position.x + 1000) % 2000) - 1000;
    life.position.z = ((life.position.z + 1000) % 2000) - 1000;
    if (life.position.y > MIN_DEPTH) life.position.y = MAX_DEPTH;
    if (life.position.y < MAX_DEPTH) life.position.y = MIN_DEPTH;
  });

  renderer.render(scene, camera);
}

// Initialize the scene
init();

// Start the animation loop
animate();
