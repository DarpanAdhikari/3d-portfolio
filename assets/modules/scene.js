import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class SceneManager {
  constructor(canvas, perfSettings) {
    this.canvas = canvas;
    this.perfSettings = perfSettings;
    this.scene = new THREE.Scene();
    this.renderer = null;
    this.camera = null;
    this.composer = null;
    this.particles = null;
    this.floor = null;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.trees = [];
  }

  init() {
    this.setupRenderer();
    this.setupCamera();
    this.setupSky();
    this.setupLights();
    this.setupGround();
    this.setupTrees();
    this.setupParticles();
    this.setupResize();
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.perfSettings.antialias,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = this.perfSettings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(8, 5, 14);
    this.camera.lookAt(0, 1.5, 0);
  }

  setupSky() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1a2a6c');
    grad.addColorStop(0.4, '#4a6fa5');
    grad.addColorStop(0.7, '#89c4e1');
    grad.addColorStop(0.85, '#b8d8e8');
    grad.addColorStop(1, '#d4e4e8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
    this.scene.fog = new THREE.FogExp2(0x89c4e1, 0.008);
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0x8899bb, 0.5);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362907, 0.8);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.8);
    sun.position.set(30, 25, 10);
    sun.castShadow = this.perfSettings.shadows;
    if (this.perfSettings.shadows) {
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 60;
      sun.shadow.camera.left = -25;
      sun.shadow.camera.right = 25;
      sun.shadow.camera.top = 25;
      sun.shadow.camera.bottom = -25;
      sun.shadow.bias = -0.001;
    }
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-20, 10, -20);
    this.scene.add(fill);
  }

  setupGround() {
    const groundGeo = new THREE.CircleGeometry(35, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5a8a4a,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.floor = new THREE.Mesh(groundGeo, groundMat);
    this.floor.name = 'floor';
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = 0;
    this.floor.receiveShadow = this.perfSettings.shadows;
    this.scene.add(this.floor);

    // Edge ring to blend
    const ring = new THREE.RingGeometry(33, 35, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x4a7a3a,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ringMesh = new THREE.Mesh(ring, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -0.01;
    this.scene.add(ringMesh);
  }

  createTree(x, z) {
    const group = new THREE.Group();

    // Trunk
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.9 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.5, 6), trunkMat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    group.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3a8a3a, roughness: 0.8 });

    const crown1 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 7, 7), leafMat);
    crown1.position.y = 1.8;
    crown1.castShadow = true;
    group.add(crown1);

    const crown2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 7, 7), leafMat);
    crown2.position.set(0.4, 2.2, 0.3);
    crown2.castShadow = true;
    group.add(crown2);

    const crown3 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 7), leafMat);
    crown3.position.set(-0.3, 2.3, -0.2);
    crown3.castShadow = true;
    group.add(crown3);

    group.position.set(x, 0, z);
    group.scale.setScalar(0.8 + Math.random() * 0.4);
    group.rotation.y = Math.random() * Math.PI * 2;

    return group;
  }

  setupTrees() {
    const positions = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 20;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
      positions.push({ x, z });
    }
    positions.forEach(p => {
      const tree = this.createTree(p.x, p.z);
      this.scene.add(tree);
      this.trees.push(tree);
    });

    // Small rocks
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.9 });
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * 18;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.15),
        rockMat
      );
      rock.position.set(Math.cos(angle) * dist, 0.05, Math.sin(angle) * dist);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  setupParticles() {
    if (!this.perfSettings.particles) return;
    const count = Math.min(this.perfSettings.particles, 500);
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 25;
      positions[i * 3] = Math.cos(angle) * dist;
      positions[i * 3 + 1] = 1.5 + Math.random() * 8;
      positions[i * 3 + 2] = Math.sin(angle) * dist;
      sizes[i] = 0.04 + Math.random() * 0.08;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.06,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  setupResize() {
    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update() {
    this.time = this.clock.getElapsedTime();

    if (this.particles) {
      this.particles.rotation.y += 0.0005;
    }

    this.trees.forEach((tree, i) => {
      tree.rotation.y += 0.0002 * (i % 2 === 0 ? 1 : -1);
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  setCameraPosition(pos, target) {
    if (pos) this.camera.position.copy(pos);
    if (target) this.camera.lookAt(target);
  }

  getCamera() { return this.camera; }
  getScene() { return this.scene; }
  getRenderer() { return this.renderer; }

  dispose() {
    this.renderer.dispose();
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}