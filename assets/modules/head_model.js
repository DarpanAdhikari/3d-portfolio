import * as THREE from 'three';

export class HeadModelBuilder {
  constructor() {
    this.geometry = null;
    this.morphTargets = {};
    this.headShapeVertices = null;
  }

  build() {
    const geo = new THREE.SphereGeometry(0.3, 64, 48);
    const pos = geo.attributes.position;
    const verts = [];

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      verts.push({ x, y, z, idx: i });
    }

    const radius = 0.3;

    for (const v of verts) {
      let { x, y, z } = v;
      let nx = x, ny = y, nz = z;

      // Elongate Y (head is taller than round)
      const headHeight = 1.35;
      ny *= headHeight;

      // Flatten Z slightly (face is not fully round)
      const faceFlat = 0.85;
      nz *= faceFlat;

      // Widen cheekbone area (y around 0.1 to 0.3)
      const cheekWiden = 1 + 0.12 * Math.exp(-Math.pow((y / radius - 0.3) / 0.35, 2)) * Math.exp(-Math.pow(x / radius, 2));
      nx *= cheekWiden;

      // Chin: pull forward and down at bottom front
      const chinPull = 1 + 0.25 * Math.exp(-Math.pow((y / radius + 1.1) / 0.3, 2)) * Math.max(0, -z / radius) * 0.5;
      ny *= chinPull;
      nz += 0.04 * Math.exp(-Math.pow((y / radius + 1.0) / 0.25, 2)) * Math.max(0, 1 - Math.abs(x / radius));

      // Nose bump at center front
      const noseZ = 0.06 * Math.exp(-Math.pow(y / radius - 0.1, 2) / 0.04) * Math.exp(-Math.pow(x / radius, 2) / 0.02);
      nz += noseZ;

      // Eye sockets: slight indent
      const eyeIndent = -0.015 * Math.exp(-Math.pow((x / radius - 0.12) / 0.06, 2)) * Math.exp(-Math.pow((y / radius - 0.35) / 0.08, 2));
      nz += eyeIndent;
      const eyeIndent2 = -0.015 * Math.exp(-Math.pow((x / radius + 0.12) / 0.06, 2)) * Math.exp(-Math.pow((y / radius - 0.35) / 0.08, 2));
      nz += eyeIndent2;

      // Forehead: slight forward
      const forehead = 0.02 * Math.exp(-Math.pow((y / radius - 0.6) / 0.2, 2)) * Math.exp(-Math.pow(x / radius, 2) / 0.15);
      nz += forehead;

      // Jaw narrowing
      const jawNarrow = 1 - 0.08 * Math.exp(-Math.pow((y / radius + 0.6) / 0.3, 2));
      nx *= jawNarrow;

      pos.setXYZ(v.idx, nx, ny, nz);
    }

    this.storeVertices(pos);
    geo.computeVertexNormals();
    this.geometry = geo;
    this.buildMorphTargets(radius);
    return geo;
  }

  storeVertices(pos) {
    this.headShapeVertices = [];
    for (let i = 0; i < pos.count; i++) {
      this.headShapeVertices.push({
        x: pos.getX(i),
        y: pos.getY(i),
        z: pos.getZ(i),
      });
    }
  }

  buildMorphTargets(radius) {
    if (!this.geometry) return;
    const pos = this.geometry.attributes.position;
    const count = pos.count;
    const base = this.headShapeVertices;

    const blink = new Float32Array(count * 3);
    const smile = new Float32Array(count * 3);
    const browRaise = new Float32Array(count * 3);
    const mouthOpen = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const v = base[i];
      const i3 = i * 3;
      const yNorm = v.y / radius;
      const xNorm = v.x / radius;
      const zNorm = v.z / radius;

      // Blink: close upper eyelid area
      blink[i3] = 0;
      blink[i3 + 1] = -0.04 * Math.exp(-Math.pow((xNorm) / 0.1, 2)) * Math.exp(-Math.pow((yNorm - 0.32) / 0.06, 2));
      blink[i3 + 2] = 0;

      // Blink left eye
      const blinkLeft = -0.04 * Math.exp(-Math.pow((xNorm + 0.12) / 0.07, 2)) * Math.exp(-Math.pow((yNorm - 0.32) / 0.06, 2));
      blink[i3 + 1] += blinkLeft;

      // Smile: pull mouth corners up and out
      const mouthY = 0.0;
      const mouthX = 0.08;
      smile[i3] = 0.02 * Math.exp(-Math.pow((xNorm - mouthX) / 0.04, 2)) * Math.exp(-Math.pow((yNorm - mouthY) / 0.04, 2));
      smile[i3] += 0.02 * Math.exp(-Math.pow((xNorm + mouthX) / 0.04, 2)) * Math.exp(-Math.pow((yNorm - mouthY) / 0.04, 2));
      smile[i3 + 1] = 0.015 * Math.exp(-Math.pow((xNorm - mouthX) / 0.04, 2)) * Math.exp(-Math.pow((yNorm - mouthY - 0.01) / 0.05, 2));
      smile[i3 + 1] += 0.015 * Math.exp(-Math.pow((xNorm + mouthX) / 0.04, 2)) * Math.exp(-Math.pow((yNorm - mouthY - 0.01) / 0.05, 2));
      smile[i3 + 2] = 0.01 * Math.exp(-Math.pow((xNorm - mouthX) / 0.04, 2)) * Math.exp(-Math.pow((yNorm - mouthY) / 0.04, 2));
      smile[i3 + 2] += 0.01 * Math.exp(-Math.pow((xNorm + mouthX) / 0.04, 2)) * Math.exp(-Math.pow((yNorm - mouthY) / 0.04, 2));

      // Eyebrow raise
      browRaise[i3] = 0;
      browRaise[i3 + 1] = 0.025 * Math.exp(-Math.pow((xNorm - 0.12) / 0.08, 2)) * Math.exp(-Math.pow((yNorm - 0.48) / 0.06, 2));
      browRaise[i3 + 1] += 0.025 * Math.exp(-Math.pow((xNorm + 0.12) / 0.08, 2)) * Math.exp(-Math.pow((yNorm - 0.48) / 0.06, 2));
      browRaise[i3 + 2] = 0.01 * Math.exp(-Math.pow((xNorm) / 0.12, 2)) * Math.exp(-Math.pow((yNorm - 0.48) / 0.08, 2));

      // Mouth open
      const mouthOpenRange = Math.exp(-Math.pow(xNorm / 0.06, 2)) * Math.exp(-Math.pow((yNorm - 0.0) / 0.05, 2));
      if (yNorm > 0) {
        mouthOpen[i3] = 0;
        mouthOpen[i3 + 1] = 0.03 * mouthOpenRange;
        mouthOpen[i3 + 2] = -0.01 * mouthOpenRange;
      } else {
        mouthOpen[i3] = 0;
        mouthOpen[i3 + 1] = -0.03 * mouthOpenRange;
        mouthOpen[i3 + 2] = 0.01 * mouthOpenRange;
      }
    }

    this.geometry.morphAttributes.position = [
      new THREE.Float32BufferAttribute(blink, 3),
      new THREE.Float32BufferAttribute(smile, 3),
      new THREE.Float32BufferAttribute(browRaise, 3),
      new THREE.Float32BufferAttribute(mouthOpen, 3),
    ];

    this.morphTargets = {
      blink: 0,
      smile: 1,
      browRaise: 2,
      mouthOpen: 3,
    };
  }

  createAnimatedHead(texture, color) {
    if (!this.geometry) this.build();
    const mat = new THREE.MeshStandardMaterial({
      map: texture || undefined,
      color: color || (texture ? 0xffffff : 0xffdbac),
      metalness: 0.05,
      roughness: 0.7,
    });
    const mesh = new THREE.Mesh(this.geometry, mat);
    mesh.name = 'avatar-head';
    mesh.castShadow = true;

    mesh.userData.morphTargets = this.morphTargets;
    mesh.userData.morphWeights = {
      blink: 0,
      smile: 0,
      browRaise: 0,
      mouthOpen: 0,
    };

    return mesh;
  }

  setBlink(mesh, amount) {
    const clamped = Math.max(0, Math.min(1, amount));
    mesh.morphTargetInfluences[this.morphTargets.blink] = clamped;
    mesh.userData.morphWeights.blink = clamped;
  }

  animateBlink(mesh, speed = 1) {
    const w = mesh.userData.morphWeights;
    w.blink = Math.max(0, w.blink - 0.05 * speed);
    mesh.morphTargetInfluences[this.morphTargets.blink] = w.blink;
  }

  triggerBlink(mesh) {
    this.setBlink(mesh, 1);
  }

  setSmile(mesh, amount) {
    const w = mesh.userData.morphWeights;
    w.smile = amount;
    mesh.morphTargetInfluences[this.morphTargets.smile] = amount;
  }

  setBrowRaise(mesh, amount) {
    const w = mesh.userData.morphWeights;
    w.browRaise = amount;
    mesh.morphTargetInfluences[this.morphTargets.browRaise] = amount;
  }

  setMouthOpen(mesh, amount) {
    const w = mesh.userData.morphWeights;
    w.mouthOpen = amount;
    mesh.morphTargetInfluences[this.morphTargets.mouthOpen] = amount;
  }

  dispose() {
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
  }
}

export const headModelBuilder = new HeadModelBuilder();