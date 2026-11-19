// Vehicles: box-built cars with arcade driving physics. The player can
// steal any parked or traffic car (E) — that is the genre's core verb —
// and owned cars can be kept in the garage.

import * as THREE from 'three';
import { CAR } from './config.js';

export const CAR_COLORS = [0xd84a3a, 0x3a7bd8, 0xf2c94c, 0x7a4ad8, 0x3ad8a0, 0xe8e8e8, 0x2a2f38, 0xff8a3d];
const CAR_NAMES = ['Comet', 'Falcon', 'Dune', 'Vesper', 'Marlin', 'Puma', 'Atlas', 'Zephyr'];

let nameCounter = 0;

export function makeCarMesh(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1c2f42 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2), glassMat);
  cabin.position.set(0, 1.3, -0.2);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
    wheels.push(w);
  }
  // Headlights.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const wx of [-0.6, 0.6]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), lightMat);
    l.position.set(wx, 0.7, 2.22);
    g.add(l);
  }
  g.userData.wheels = wheels;
  return g;
}

export class Car {
  constructor(scene, x, z, angle, color, name, kind) {
    this.scene = scene;
    this.kind = kind || 'civilian'; // civilian | police | player
    this.name = name || CAR_NAMES[nameCounter++ % CAR_NAMES.length];
    this.color = color;
    this.mesh = makeCarMesh(color);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = angle;
    scene.add(this.mesh);
    this.x = x; this.z = z;
    this.angle = angle;
    this.speed = 0;
    this.steer = 0;
    this.driven = false;
    this.broken = false;
    this.health = 100;
  }

  // Arcade update. input: {throttle (-1..1), steer (-1..1)}.
  update(dt, input, world) {
    if (this.broken) { this.speed *= Math.max(0, 1 - 3 * dt); }
    const accel = input.throttle > 0 ? CAR.accel * input.throttle
      : input.throttle < 0 ? CAR.reverseAccel * input.throttle : 0;
    if (input.throttle === 0) this.speed -= Math.sign(this.speed) * CAR.brake * 0.4 * dt;
    this.speed += accel * dt;
    // Braking: throttle opposite to motion stops fast.
    if (input.throttle !== 0 && Math.sign(input.throttle) !== Math.sign(this.speed) && Math.abs(this.speed) > 1) {
      this.speed -= Math.sign(this.speed) * CAR.brake * dt;
    }
    const maxF = CAR.maxSpeed * (this.boost || 1), maxR = CAR.maxReverse;
    this.speed = Math.max(-maxR, Math.min(maxF, this.speed));
    if (Math.abs(this.speed) < 0.05 && input.throttle === 0) this.speed = 0;
    const dir = this.speed >= 0 ? 1 : -1;
    this.steer += (input.steer - this.steer) * Math.min(1, 8 * dt);
    this.angle += this.steer * CAR.turnRate * (this.grip || 1) * dir * Math.min(1, Math.abs(this.speed) / 8) * dt;
    const nx = this.x + Math.sin(this.angle) * this.speed * dt;
    const nz = this.z + Math.cos(this.angle) * this.speed * dt;
    const resolved = world.resolveCollision(nx, nz, 1.6);
    if (resolved.x !== nx || resolved.z !== nz) {
      this.speed *= 0.4; // scrape: lose speed, keep going
    }
    this.x = resolved.x; this.z = resolved.z;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.angle;
    // Wheel spin + a touch of body roll.
    const spin = this.speed * dt * 2.4;
    for (const w of this.mesh.userData.wheels) w.rotation.x += spin;
    this.mesh.rotation.z = -this.steer * Math.min(1, Math.abs(this.speed) / 20) * 0.06;
  }

  damage(amount) {
    this.health -= amount;
    if (this.health <= 0 && !this.broken) {
      this.broken = true;
      this.speed = 0;
    }
    return this.broken;
  }

  remove() { this.scene.remove(this.mesh); }
}

// Parked cars the player can steal, placed along roads by seed.
export function spawnParkedCars(scene, world, rng, count) {
  const cars = [];
  const lines = [];
  for (let i = 0; i <= 8; i++) lines.push(-320 + 8 + i * 80);
  for (let i = 0; i < count; i++) {
    const line = rng.pick(lines);
    const along = rng.range(-300, 300);
    const side = rng.chance(0.5) ? -1 : 1;
    const vertical = rng.chance(0.5);
    const x = vertical ? line + side * 5.5 : along;
    const z = vertical ? along : line + side * 5.5;
    const angle = vertical ? (side > 0 ? Math.PI : 0) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
    const car = new Car(scene, x, z, angle, rng.pick(CAR_COLORS));
    cars.push(car);
  }
  return cars;
}
