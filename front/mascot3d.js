/**
 * Tangibl 3D Mascot Viewer
 * Renders an animated GLB model as the wallet mascot
 * Uses Three.js r162 ES modules + GLTFLoader + AnimationMixer
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, mascotGroup;
let mixer = null;
let clock = new THREE.Clock();
let mouseX = 0, mouseY = 0;
let floatTime = 0;

function initMascot3D() {
  const container = document.getElementById('mascot-3d-container');
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0.5, 3);

  // Renderer
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  container.appendChild(renderer.domElement);

  // Lights — rich multi-point setup for premium look
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
  mainLight.position.set(2, 3, 4);
  mainLight.castShadow = true;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.6);
  fillLight.position.set(-2, 1, -1);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffd700, 0.4);
  rimLight.position.set(0, -1, -3);
  scene.add(rimLight);

  // Bottom green glow (matches Tangibl pastel aesthetic)
  const bottomLight = new THREE.PointLight(0x86efac, 0.5, 5);
  bottomLight.position.set(0, -1.5, 0);
  scene.add(bottomLight);

  // Load GLB model
  const loader = new GLTFLoader();
  loader.load(
    'sample.glb',
    function (gltf) {
      const model = gltf.scene;

      // Center and scale the model to fit the viewport
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.6 / maxDim;

      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));

      // Wrap in a group for clean transformations
      mascotGroup = new THREE.Group();
      mascotGroup.add(model);
      scene.add(mascotGroup);

      // Setup animations if the GLB contains them
      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach(function (clip) {
          const action = mixer.clipAction(clip);
          action.play();
        });
      }

      // Hide loading indicator
      const loadingEl = document.getElementById('mascot-loading');
      if (loadingEl) loadingEl.style.display = 'none';
    },
    function (xhr) {
      // Progress callback
      if (xhr.total > 0) {
        const pct = Math.round((xhr.loaded / xhr.total) * 100);
        const loadingEl = document.getElementById('mascot-loading');
        if (loadingEl) loadingEl.textContent = pct + '%';
      }
    },
    function (error) {
      console.error('Error loading GLB mascot:', error);
      const loadingEl = document.getElementById('mascot-loading');
      if (loadingEl) {
        loadingEl.textContent = '🦊';
        loadingEl.style.fontSize = '64px';
      }
    }
  );

  // Mouse / touch interaction
  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('touchmove', onTouchMove, { passive: true });
  container.addEventListener('click', showMascotTooltip);

  // Start animation loop
  animate();
}

function onMouseMove(event) {
  const container = document.getElementById('mascot-3d-container');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onTouchMove(event) {
  if (event.touches.length > 0) {
    const container = document.getElementById('mascot-3d-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    mouseX = ((event.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
    mouseY = -((event.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
  }
}

const tooltipMessages = [
  "¡Tu tGLD está brillando hoy! ✨",
  "El oro digital es el futuro 💰",
  "Has ahorrado 2 tGLD esta semana 🏆",
  "Mantén tu racha financiera 🔥",
  "¿Listo para hacer un Swap? 🔄",
  "Tus finanzas están protegidas 🛡️"
];
let tooltipTimeout;

function showMascotTooltip() {
  const tooltip = document.getElementById('mascot-tooltip');
  if (!tooltip) return;
  
  // Random message
  const msg = tooltipMessages[Math.floor(Math.random() * tooltipMessages.length)];
  tooltip.textContent = msg;
  
  // Show
  tooltip.classList.add('show');
  
  // React mascot (jump slightly)
  if (mascotGroup) {
    mascotGroup.position.y += 0.1;
  }
  
  // Hide after 3s
  clearTimeout(tooltipTimeout);
  tooltipTimeout = setTimeout(() => {
    tooltip.classList.remove('show');
  }, 3000);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  floatTime += 0.015;

  // Update animation mixer (plays GLB embedded animations)
  if (mixer) {
    mixer.update(delta);
  }

  if (mascotGroup) {
    // Gentle floating motion
    mascotGroup.position.y = Math.sin(floatTime) * 0.04;

    // Mouse-reactive + idle rotation
    const targetRotY = mouseX * 0.4 + Math.sin(floatTime * 0.5) * 0.15;
    const targetRotX = mouseY * 0.15;
    mascotGroup.rotation.y += (targetRotY - mascotGroup.rotation.y) * 0.05;
    mascotGroup.rotation.x += (targetRotX - mascotGroup.rotation.x) * 0.05;

    // Subtle breathing scale pulse
    const pulseFactor = 1 + Math.sin(floatTime * 1.5) * 0.008;
    mascotGroup.scale.setScalar(pulseFactor);
  }

  renderer.render(scene, camera);
}

// Init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMascot3D);
} else {
  initMascot3D();
}
