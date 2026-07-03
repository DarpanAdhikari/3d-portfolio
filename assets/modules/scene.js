import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CONFIG } from '../config.js';

export class SceneManager {
  constructor(canvas, perfSettings) {
    this.canvas = canvas;
    this.perfSettings = perfSettings;
    this.scene = new THREE.Scene();
    this.renderer = null;
    this.camera = null;
    this.composer = null;
    this.bloomPass = null;
    this.particles = null;
    this.grid = null;
    this.floor = null;
    this.clock = new THREE.Clock();
    this.time = 0;
  }

  init() {
    this.setupRenderer();
    this.setupCamera();
    this.setupScene();
    this.setupLights();
    this.setupFloor();
    this.setupWalls();
    this.setupParticles();
    this.setupPostProcessing();
    this.setupResize();
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.perfSettings.antialias,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = this.perfSettings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 3, 15);
    this.camera.lookAt(0, 1.5, 0);
  }

  setupScene() {
    this.scene.background = new THREE.Color(CONFIG.scene.backgroundColor);
    this.scene.fog = new THREE.FogExp2(CONFIG.scene.backgroundColor, 0.015);
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0x00f5d4, 1.5);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = this.perfSettings.shadows;
    if (this.perfSettings.shadows) {
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 50;
      mainLight.shadow.camera.left = -20;
      mainLight.shadow.camera.right = 20;
      mainLight.shadow.camera.top = 20;
      mainLight.shadow.camera.bottom = -20;
      mainLight.shadow.bias = -0.001;
    }
    this.scene.add(mainLight);

    const accentLight1 = new THREE.PointLight(0x8b5cf6, 2, 30);
    accentLight1.position.set(-12, 5, -12);
    this.scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(0xf472b6, 2, 30);
    accentLight2.position.set(12, 5, -12);
    this.scene.add(accentLight2);

    const accentLight3 = new THREE.PointLight(0xfbbf24, 2, 30);
    accentLight3.position.set(0, 5, 15);
    this.scene.add(accentLight3);

    this.lights = { main: mainLight, accents: [accentLight1, accentLight2, accentLight3] };
  }

  setupFloor() {
    const floorGeo = new THREE.PlaneGeometry(80, 80, 80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d1220,
      metalness: 0.1,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.name = 'floor';
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = this.perfSettings.shadows;
    this.scene.add(this.floor);

    const gridLines = new THREE.GridHelper(80, 80, 0x00f5d4, 0x0a1525);
    gridLines.position.y = 0.02;
    gridLines.material.transparent = true;
    gridLines.material.opacity = 0.15;
    this.grid = gridLines;
    this.scene.add(gridLines);
  }

  setupWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0f1525,
      metalness: 0.2,
      roughness: 0.7,
      side: THREE.DoubleSide,
    });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), wallMat);
    backWall.position.set(0, 15, -40);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const sideWall1 = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), wallMat);
    sideWall1.position.set(-40, 15, 0);
    sideWall1.rotation.y = Math.PI / 2;
    sideWall1.receiveShadow = true;
    this.scene.add(sideWall1);

    const sideWall2 = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), wallMat);
    sideWall2.position.set(40, 15, 0);
    sideWall2.rotation.y = -Math.PI / 2;
    sideWall2.receiveShadow = true;
    this.scene.add(sideWall2);

    this.addNeonLines();
  }

  addNeonLines() {
    const neonGeo = new THREE.BoxGeometry(80, 0.1, 0.1);
    const neonMat1 = new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.5 });
    const neonMat2 = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.5 });
    const neonMat3 = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.5 });

    const positions = [
      { y: 0.5, z: -39.9, mat: neonMat1 },
      { y: 5, z: -39.9, mat: neonMat2 },
      { y: 10, z: -39.9, mat: neonMat3 },
      { x: -39.9, y: 0.5, mat: neonMat1 },
      { x: -39.9, y: 5, mat: neonMat2 },
      { x: 39.9, y: 0.5, mat: neonMat3 },
      { x: 39.9, y: 5, mat: neonMat1 },
    ];

    positions.forEach(p => {
      const line = new THREE.Mesh(neonGeo, p.mat);
      line.position.set(p.x || 0, p.y, p.z || 0);
      if (p.x !== undefined) line.rotation.z = Math.PI / 2;
      this.scene.add(line);
    });
  }

  setupParticles() {
    if (!this.perfSettings.particles) return;

    const count = this.perfSettings.particles;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);

    const colorPalette = [new THREE.Color(0x00f5d4), new THREE.Color(0x8b5cf6), new THREE.Color(0xf472b6), new THREE.Color(0xfbbf24)];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 80;
      positions[i3 + 1] = Math.random() * 30;
      positions[i3 + 2] = (Math.random() - 0.5) * 80;

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;

      sizes[i] = Math.random() * 0.3 + 0.1;
      speeds[i] = Math.random() * 0.3 + 0.1;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    if (this.perfSettings.bloom) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,
        0.4,
        0.85
      );
      this.bloomPass.threshold = 0.3;
      this.bloomPass.strength = 0.6;
      this.bloomPass.radius = 0.5;
      this.composer.addPass(this.bloomPass);
    }
  }

  setupResize() {
    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  update() {
    this.time = this.clock.getElapsedTime();

    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      const speeds = this.particles.geometry.attributes.speed.array;
      const phases = this.particles.geometry.attributes.phase.array;
      const count = this.particles.geometry.attributes.position.count;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3 + 1] += speeds[i] * 0.008;
        positions[i3] += Math.sin(this.time * speeds[i] + phases[i]) * 0.003;
        positions[i3 + 2] += Math.cos(this.time * speeds[i] + phases[i]) * 0.003;

        if (positions[i3 + 1] > 30) positions[i3 + 1] = 0;
        if (positions[i3 + 1] < 0) positions[i3 + 1] = 30;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.rotation.y += 0.0001;
    }

    if (this.grid) {
      this.grid.material.opacity = 0.15 + Math.sin(this.time * 0.5) * 0.05;
    }

    this.lights.accents.forEach((light, i) => {
      light.intensity = 2 + Math.sin(this.time * 0.7 + i) * 0.5;
    });
  }

  render() {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  setCameraPosition(pos, target) {
    if (pos) this.camera.position.copy(pos);
    if (target) this.camera.lookAt(target);
  }

  getCamera() {
    return this.camera;
  }

  getScene() {
    return this.scene;
  }

  getRenderer() {
    return this.renderer;
  }

  setBloomEnabled(enabled) {
    if (this.bloomPass) {
      this.bloomPass.enabled = enabled;
    }
  }

  setShadowsEnabled(enabled) {
    this.renderer.shadowMap.enabled = enabled;
    this.lights.main.castShadow = enabled;
  }

  dispose() {
    this.renderer.dispose();
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}