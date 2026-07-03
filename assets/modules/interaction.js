import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from '../config.js';

export class InteractionManager {
  constructor(camera, renderer, scene, avatar, panels, dialogue, cinematic, perfSettings) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.avatar = avatar;
    this.panels = panels;
    this.dialogue = dialogue;
    this.cinematic = cinematic;
    this.perfSettings = perfSettings;

    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.keys = {};
    this.moveSpeed = 5.0;
    this.isPointerLocked = false;
    this.useFirstPerson = !perfSettings.isMobile && navigator.hardwareConcurrency > 4;
    this.lastPanelClick = 0;
    this.idleTimer = 0;
    this.lastInteraction = Date.now();
  }

  init() {
    this.setupControls();
    this.setupEvents();
    this.setupPointerLock();
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minPolarAngle = 0.1;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.5;
    this.controls.target.set(0, 1.5, 0);
  }

  setupEvents() {
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
  }

  setupPointerLock() {
    this.renderer.domElement.addEventListener('click', async () => {
      if (this.useFirstPerson && !this.isPointerLocked) {
        try {
          await this.renderer.domElement.requestPointerLock();
        } catch (e) {
          console.log('Pointer lock failed');
        }
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
      if (this.isPointerLocked) {
        this.controls.enabled = false;
      } else {
        this.controls.enabled = true;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.handlePointerLockMove(e);
      }
    });
  }

  handlePointerLockMove(e) {
    const sensitivity = 0.002;
    const yaw = new THREE.Object3D();
    yaw.rotation.y = -e.movementX * sensitivity;
    const pitch = new THREE.Object3D();
    pitch.rotation.x = -e.movementY * sensitivity;

    const quat = new THREE.Quaternion();
    quat.multiplyQuaternions(yaw.quaternion, pitch.quaternion);
    this.camera.quaternion.premultiply(quat);
  }

  onClick(e) {
    if (this.isPointerLocked) return;

    this.lastInteraction = Date.now();
    const rect = this.renderer.domElement.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const panelKey = this.panels.handleClick(clientX, clientY);
    if (panelKey) {
      this.handlePanelClick(panelKey);
      return;
    }

    this.handleWorldClick(clientX, clientY);
  }

  onMouseMove(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onKeyDown(e) {
    this.keys[e.code] = true;

    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'Escape') {
      if (this.isPointerLocked) {
        document.exitPointerLock();
      }
      this.panels.closePanelContent();
    }
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
  }

  onWheel(e) {
    if (this.panels.openPanel) {
      e.preventDefault();
    }
  }

  handlePanelClick(key) {
    const now = Date.now();
    if (now - this.lastPanelClick < 500) return;
    this.lastPanelClick = now;

    const panel = this.panels.getPanel(key);
    if (!panel) return;

    this.panels.openPanelContent(key);

    const panelPos = new THREE.Vector3();
    panel.getWorldPosition(panelPos);

    const cameraPos = panelPos.clone().add(new THREE.Vector3(
      Math.sin(panel.rotation.y) * 6,
      1.5,
      Math.cos(panel.rotation.y) * 6
    ));

    this.cinematic.transitionTo(
      cameraPos,
      panelPos.clone().setY(1.5),
      1.0,
      () => {
        this.avatar.walkTo(panelPos.clone().setY(0).add(new THREE.Vector3(
          Math.sin(panel.rotation.y) * 2,
          0,
          Math.cos(panel.rotation.y) * 2
        )));
        this.avatar.pointAt(panelPos.clone().setY(1.5));

        this.playDialogueForPanel(key);
      }
    );
  }

  playDialogueForPanel(key) {
    switch (key) {
      case 'about': this.dialogue.sayAbout(); break;
      case 'skills': this.dialogue.saySkills(); break;
      case 'projects': this.dialogue.sayProjects(); break;
      case 'contact': this.dialogue.sayContact(); break;
    }
  }

  handleWorldClick(clientX, clientY) {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const floorIntersects = this.raycaster.intersectObject(this.scene.getObjectByName('floor') || this.scene.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry'));
    if (floorIntersects.length > 0) {
      const point = floorIntersects[0].point;
      if (this.useFirstPerson) {
        this.avatar.walkTo(point);
      } else {
        this.controls.target.lerp(point.setY(1.5), 0.1);
      }
    }
  }

  update(delta) {
    if (this.cinematic.isTransitioning) {
      this.cinematic.update(delta);
      this.controls.enabled = false;
    } else {
      this.controls.enabled = !this.isPointerLocked;
    }

    if (this.useFirstPerson && this.isPointerLocked && !this.cinematic.isTransitioning) {
      this.handleFirstPersonMovement(delta);
    }

    this.controls.update();

    this.idleTimer += delta;
    if (this.idleTimer > 15 && !this.panels.openPanel && !this.dialogue.isSpeaking) {
      this.dialogue.sayIdle();
      this.idleTimer = 0;
    }
  }

  handleFirstPersonMovement(delta) {
    const direction = new THREE.Vector3();
    const speed = this.moveSpeed * delta;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) direction.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) direction.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) direction.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) direction.x += 1;

    if (direction.length() > 0) {
      direction.normalize();
      direction.applyQuaternion(this.camera.quaternion);
      direction.y = 0;

      const newPos = this.camera.position.clone().addScaledVector(direction, speed);
      newPos.y = 1.6;
      newPos.x = THREE.MathUtils.clamp(newPos.x, -35, 35);
      newPos.z = THREE.MathUtils.clamp(newPos.z, -35, 35);

      this.camera.position.copy(newPos);
      this.controls.target.copy(newPos).add(new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion));
    }
  }

  setFirstPerson(enabled) {
    this.useFirstPerson = enabled;
    if (!enabled && this.isPointerLocked) {
      document.exitPointerLock();
    }
  }

  dispose() {
    this.controls.dispose();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('pointerlockchange', this.handlePointerLockMove);
  }
}