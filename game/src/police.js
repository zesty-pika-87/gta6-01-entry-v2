// Police: the wanted system. Crimes add stars; patrol cars chase and
// ram the player; at 3 stars roadblocks appear on the roads ahead; at
// 4 stars a helicopter joins and never loses the trail. Stars decay
// when the player stays out of sight.

import * as THREE from 'three';
import { Car } from './vehicles.js';
import { WANTED } from './config.js';

export class Police {
  constructor(scene, world, rng) {
    this.scene = scene;
    this.world = world;
    this.rng = rng;
    this.wanted = 0;
    this.cars = [];
    this.heli = null;
    this.heliActive = false;
    this.roadblocks = [];
    this.spawnTimer = 0;
    this.decayTimer = 0;
    this.bustedTimer = 0;
  }

  addWanted(n, reason) {
    const before = this.wanted;
    this.wanted = Math.min(WANTED.max, this.wanted + n);
    if (this.wanted > before) return { raised: true, reason };
    return { raised: false };
  }

  // Spawn patrol cars up to the wanted level (1 car per star, max 4).
  ensureCars(px, pz) {
    const want = Math.min(Math.ceil(this.wanted), 4);
    while (this.cars.length < want) {
      const a = this.rng.range(0, Math.PI * 2);
      const car = new Car(this.scene, px + Math.sin(a) * 55, pz + Math.cos(a) * 55, a, 0x1c2f4a, 'Interceptor', 'police');
      // Police light bar.
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
      bar.position.y = 1.75;
      car.mesh.add(bar);
      car.mesh.userData.lightBar = bar;
      car.chaseSpeed = 30 + this.wanted * 1.5;
      this.cars.push(car);
    }
    while (this.cars.length > want) {
      const c = this.cars.pop();
      c.remove();
    }
  }

  update(dt, playerPos, playerInCar, onBusted, onRam) {
    // Wanted decays slowly when no police car can see the player.
    if (this.wanted > 0) {
      this.decayTimer += dt;
      let seen = this.heliActive;
      for (const c of this.cars) {
        if (Math.hypot(c.x - playerPos.x, c.z - playerPos.z) < 45) { seen = true; break; }
      }
      if (!seen && this.decayTimer > 1) {
        this.decayTimer = 0;
        this.wanted = Math.max(0, this.wanted - WANTED.decayPerSec);
        if (this.wanted < 0.05) this.wanted = 0;
      }
    }
    const stars = Math.ceil(this.wanted);
    this.ensureCars(playerPos.x, playerPos.z);

    // Chase + ram.
    for (const car of this.cars) {
      const dx = playerPos.x - car.x, dz = playerPos.z - car.z;
      const dist = Math.hypot(dx, dz) || 1;
      const targetAngle = Math.atan2(dx, dz);
      let da = targetAngle - car.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, da));
      const speed = Math.min(car.chaseSpeed, dist * 1.2 + 8);
      car.speed = speed;
      const nx = car.x + Math.sin(car.angle) * speed * dt;
      const nz = car.z + Math.cos(car.angle) * speed * dt;
      const r = this.world.resolveCollision(nx, nz, 1.6);
      car.x = r.x; car.z = r.z;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.angle;
      // Flashing light bar.
      if (car.mesh.userData.lightBar) {
        car.mesh.userData.lightBar.material.color.setHex(Math.floor(performance.now() / 250) % 2 ? 0xff2a2a : 0x2a6aff);
      }
      // Ram: close contact with the player (once a second at most).
      if (car.ramCd > 0) car.ramCd -= dt;
      if (dist < 3.2 && car.ramCd <= 0) {
        car.ramCd = 1;
        onRam && onRam(car, dist);
        // Busted if the player is on foot and a cop reaches them.
        if (!playerInCar) {
          this.bustedTimer += dt;
          if (this.bustedTimer > 1.2) {
            this.bustedTimer = 0;
            onBusted && onBusted();
          }
        }
      } else {
        this.bustedTimer = Math.max(0, this.bustedTimer - dt * 2);
      }
    }

    // Helicopter at 4+ stars.
    if (stars >= WANTED.heliAt && !this.heliActive) this.spawnHeli();
    if (stars < WANTED.heliAt && this.heliActive) this.removeHeli();
    if (this.heliActive && this.heli) {
      const t = performance.now() / 1000;
      const hx = playerPos.x + Math.sin(t * 0.5) * 14;
      const hz = playerPos.z + Math.cos(t * 0.4) * 14;
      this.heli.position.set(hx, 38 + Math.sin(t * 1.3) * 2, hz);
      this.heli.rotation.y = Math.atan2(playerPos.x - hx, playerPos.z - hz);
      this.heli.userData.rotor.rotation.y += dt * 22;
      this.heli.userData.spot.position.set(0, -19, 0);
    }

    // Roadblocks at 3+ stars: two parked police cars across a road ahead.
    if (stars >= WANTED.roadblockAt && this.roadblocks.length === 0) {
      this.spawnRoadblock(playerPos);
    }
    if (stars < WANTED.roadblockAt && this.roadblocks.length > 0) {
      for (const c of this.roadblocks) c.remove();
      this.roadblocks = [];
    }
  }

  spawnHeli() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 6), new THREE.MeshLambertMaterial({ color: 0x1c2f4a }));
    g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 5), new THREE.MeshLambertMaterial({ color: 0x1c2f4a }));
    tail.position.set(0, 0.3, -5);
    g.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 0.6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    rotor.position.y = 1.1;
    g.add(rotor);
    g.userData.rotor = rotor;
    const spot = new THREE.Mesh(new THREE.ConeGeometry(3, 38, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
    spot.position.y = -19;
    g.add(spot);
    g.userData.spot = spot;
    this.scene.add(g);
    this.heli = g;
    this.heliActive = true;
  }

  removeHeli() {
    if (this.heli) this.scene.remove(this.heli);
    this.heli = null;
    this.heliActive = false;
  }

  spawnRoadblock(playerPos) {
    const angle = this.rng.range(0, Math.PI * 2);
    const bx = playerPos.x + Math.sin(angle) * 40;
    const bz = playerPos.z + Math.cos(angle) * 40;
    for (const off of [-3, 3]) {
      const car = new Car(this.scene, bx + Math.cos(angle) * off, bz - Math.sin(angle) * off, angle + Math.PI / 2, 0x1c2f4a, 'Roadblock', 'police');
      this.roadblocks.push(car);
    }
  }

  reset() {
    for (const c of this.cars) c.remove();
    this.cars = [];
    for (const c of this.roadblocks) c.remove();
    this.roadblocks = [];
    this.removeHeli();
    this.wanted = 0;
  }
}
