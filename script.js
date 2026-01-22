// ===================== API REQUEST DEDUPLICATION =====================
const IN_FLIGHT_REQUESTS = new Map();

// ===================== GLOBAL VARIABLES =====================
let scene, camera, renderer, controls;
let currentMesh;
let currentModel;
let autoRotationSpeed = 0.01;
let isAutoRotating = true;
let parallaxEnabled = true;
let targetOrbitOffset = { x: 0, y: 0 };
let currentOrbitOffset = { x: 0, y: 0 };

// ===================== SHAPES =====================
const shapes = {
  cube: () => new THREE.BoxGeometry(2, 2, 2),
  sphere: () => new THREE.SphereGeometry(1.5, 32, 32),
  torus: () => new THREE.TorusGeometry(1.5, 0.5, 16, 100),
  cylinder: () => new THREE.CylinderGeometry(1, 1, 2, 32),
  octahedron: () => new THREE.OctahedronGeometry(1.5),
};

// ===================== INIT =====================
function init() {
  const canvas = document.getElementById("three-canvas");
  const container = document.querySelector(".canvas-container");

  scene = new THREE.Scene();

  const aspectRatio = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
  camera.position.set(5, 5, 5);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  setupLighting();

  const modelPath =
    canvas?.dataset.model || "assets/models/prism.glb";
  loadGltfFromUrl(modelPath, undefined, safeCreatePrimitiveFallback);

  setupControls();
  setupEventListeners();

  setTimeout(() => {
    document.getElementById("loading-screen")?.classList.add("hidden");
  }, 1000);

  animate();
}

// ===================== LIGHTING =====================
function setupLighting() {
  scene.add(new THREE.AmbientLight(0x404040, 0.6));

  const d = new THREE.DirectionalLight(0xffffff, 1);
  d.position.set(10, 10, 5);
  d.castShadow = true;
  scene.add(d);
}

// ===================== CONTROLS =====================
function setupControls() {
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
}

// ===================== ANIMATION =====================
function animate() {
  requestAnimationFrame(animate);

  if (currentMesh && isAutoRotating) {
    currentMesh.rotation.y += autoRotationSpeed;
  }

  if (currentModel && isAutoRotating) {
    currentModel.rotation.y += autoRotationSpeed;
  }

  controls.update();
  renderer.render(scene, camera);
}

// ===================== MODEL LOADING =====================
function loadGltfFromUrl(url, onDone, onError) {
  const loader = new THREE.GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      if (currentModel) disposeObject(currentModel);
      currentModel = gltf.scene;
      scene.add(currentModel);
      if (onDone) onDone();
    },
    undefined,
    onError
  );
}

function safeCreatePrimitiveFallback() {
  createShape("octahedron");
}

// ===================== SHAPES =====================
function createShape(type) {
  if (currentMesh) disposeObject(currentMesh);
  const mat = new THREE.MeshPhongMaterial({ color: "#66ccff" });
  currentMesh = new THREE.Mesh(shapes[type](), mat);
  scene.add(currentMesh);
}

// ===================== UTIL =====================
function disposeObject(obj) {
  obj.traverse((c) => {
    if (c.isMesh) {
      c.geometry?.dispose();
      c.material?.dispose();
    }
  });
  scene.remove(obj);
}

// ===================== THEME =====================
function saveTheme(theme) {
  localStorage.setItem("xaytheon:theme", theme);
}

// ===================== GITHUB API =====================
async function ghJson(url, headers = {}) {
  const key = `GET:${url}`;

  if (IN_FLIGHT_REQUESTS.has(key)) {
    return IN_FLIGHT_REQUESTS.get(key);
  }

  const promise = fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "XAYTHEON",
      ...headers,
    },
  })
    .then((res) => {
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      return res.json();
    })
    .finally(() => IN_FLIGHT_REQUESTS.delete(key));

  IN_FLIGHT_REQUESTS.set(key, promise);
  return promise;
}

// ===================== DOM READY =====================
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("three-canvas")) {
    init();
  }
});

