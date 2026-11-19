// Render: the three.js renderer and the chase camera. Golden-hour
// lighting is fixed; the camera sits behind the player on foot and
// pulls back and up when driving, with a soft lag.

import * as THREE from 'three';
import { PALETTE } from './config.js';

export class Render {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2000);
    this.camPos = new THREE.Vector3(0, 12, -18);
    this.camLook = new THREE.Vector3(0, 1, 0);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Chase camera: behind the heading, higher and further in a car.
  update(dt, focus, angle, inCar, shake) {
    const dist = inCar ? 13.5 : 9.5;
    const height = inCar ? 5.2 : 4.2;
    const tx = focus.x - Math.sin(angle) * dist;
    const tz = focus.z - Math.cos(angle) * dist;
    const k = 1 - Math.pow(0.001, dt); // smooth follow
    this.camPos.x += (tx - this.camPos.x) * k;
    this.camPos.y += (height - this.camPos.y) * k;
    this.camPos.z += (tz - this.camPos.z) * k;
    this.camLook.x += (focus.x - this.camLook.x) * k;
    this.camLook.y += (1.6 - this.camLook.y) * k;
    this.camLook.z += (focus.z - this.camLook.z) * k;
    this.camera.position.set(
      this.camPos.x + (shake ? shake.x : 0),
      this.camPos.y + (shake ? shake.y : 0),
      this.camPos.z,
    );
    this.camera.lookAt(this.camLook);
  }

  draw() {
    this.renderer.render(this.scene, this.camera);
  }
}
