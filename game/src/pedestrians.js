// Pedestrians: sunny-day walkers strolling the sidewalks. They flee
// from gunfire and cars, and getting hit raises the wanted level — the
// city reacts to what the player does.

import * as THREE from 'three';

const SHIRTS = [0xff8a5c, 0x5cbaff, 0x9dff7a, 0xff5c8a, 0xc9a0ff, 0xffe066, 0x7ae0d8, 0xff6b6b];

export class Pedestrians {
  constructor(scene, world, rng) {
    this.scene = scene;
    this.world = world;
    this.rng = rng;
    this.peds = [];
  }

  spawn(count) {
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const shirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.9, 0.4),
        new THREE.MeshLambertMaterial({ color: this.rng.pick(SHIRTS) }),
      );
      shirt.position.y = 1.05;
      g.add(shirt);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 10, 10),
        new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
      );
      head.position.y = 1.75;
      g.add(head);
      const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2f38 });
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), legMat);
      legL.position.set(-0.16, 0.35, 0);
      g.add(legL);
      const legR = legL.clone();
      legR.position.x = 0.16;
      g.add(legR);
      const x = this.rng.range(-300, 300);
      const z = this.rng.range(-300, 300);
      g.position.set(x, 0, z);
      this.scene.add(g);
      this.peds.push({
        mesh: g, x, z,
        angle: this.rng.range(0, Math.PI * 2),
        speed: this.rng.range(1.0, 2.0),
        state: 'walk', // walk | flee | down
        fleeTimer: 0,
        legL, legR, phase: this.rng.range(0, 6),
      });
    }
  }

  update(dt, threats) {
    for (const p of this.peds) {
      if (p.state === 'down') continue;
      // Flee from the nearest threat (gunfire, speeding car, police chase).
      let fx = 0, fz = 0, scared = false;
      for (const t of threats) {
        const dx = p.x - t.x, dz = p.z - t.z;
        const d = Math.hypot(dx, dz);
        if (d < t.radius) {
          scared = true;
          fx += (dx / (d || 1)) * (1 - d / t.radius);
          fz += (dz / (d || 1)) * (1 - d / t.radius);
        }
      }
      if (scared) {
        p.state = 'flee';
        p.fleeTimer = 1.5;
        p.angle = Math.atan2(fx, fz);
        p.speed = 4.2;
      } else if (p.state === 'flee') {
        p.fleeTimer -= dt;
        if (p.fleeTimer <= 0) { p.state = 'walk'; p.speed = this.rng.range(1.0, 2.0); }
      } else {
        // Wander: occasionally pick a new heading, prefer sidewalks.
        if (this.rng.chance(dt * 0.15)) p.angle += this.rng.range(-1.2, 1.2);
      }
      const nx = p.x + Math.sin(p.angle) * p.speed * dt;
      const nz = p.z + Math.cos(p.angle) * p.speed * dt;
      const r = this.world.resolveCollision(nx, nz, 0.5);
      p.x = r.x; p.z = r.z;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.angle;
      // Walk cycle.
      p.phase += dt * p.speed * 4;
      const swing = Math.sin(p.phase) * 0.5;
      p.legL.rotation.x = swing;
      p.legR.rotation.x = -swing;
    }
  }

  // Returns the ped hit, if any, within radius of (x, z).
  hitAt(x, z, radius) {
    for (const p of this.peds) {
      if (p.state === 'down') continue;
      if (Math.hypot(p.x - x, p.z - z) < radius) return p;
    }
    return null;
  }

  knockDown(p) {
    p.state = 'down';
    p.mesh.rotation.x = Math.PI / 2;
    p.mesh.position.y = 0.4;
  }
}
