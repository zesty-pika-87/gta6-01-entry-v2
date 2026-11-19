// Traffic: civilian cars looping the road grid. They keep their lane,
// slow for the car ahead, and honk when the player blocks them. They are
// also stealable — walk up and press E.

import { Car, CAR_COLORS } from './vehicles.js';

export class Traffic {
  constructor(scene, world, rng) {
    this.scene = scene;
    this.world = world;
    this.rng = rng;
    this.cars = [];
    this.spawnTimer = 0;
  }

  spawn(count) {
    const lines = [];
    for (let i = 0; i <= 8; i++) lines.push(-320 + 8 + i * 80);
    for (let i = 0; i < count; i++) {
      const vertical = this.rng.chance(0.5);
      const line = this.rng.pick(lines);
      const along = this.rng.range(-300, 300);
      const dir = this.rng.chance(0.5) ? 1 : -1;
      const x = vertical ? line + dir * 3.5 : along;
      const z = vertical ? along : line + dir * 3.5;
      const angle = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      const car = new Car(this.scene, x, z, angle, this.rng.pick(CAR_COLORS));
      car.speed = this.rng.range(8, 14);
      car.cruise = car.speed;
      car.vertical = vertical;
      car.dir = dir;
      car.lane = line;
      this.cars.push(car);
    }
  }

  // Simple lane following: drive along the road line, turn at the edge.
  update(dt, playerCar, onStolen) {
    for (const car of this.cars) {
      if (car.driven) continue; // player is driving it now
      if (car.broken) continue;
      // Slow down if something is ahead within 10 m.
      let target = car.cruise;
      for (const other of this.cars) {
        if (other === car || other.driven) continue;
        const dx = other.x - car.x, dz = other.z - car.z;
        const ahead = car.vertical ? dz * car.dir : dx * car.dir;
        const side = car.vertical ? Math.abs(dx) : Math.abs(dz);
        if (ahead > 0 && ahead < 11 && side < 3) { target = 0; break; }
      }
      if (playerCar) {
        const dx = playerCar.x - car.x, dz = playerCar.z - car.z;
        const ahead = car.vertical ? dz * car.dir : dx * car.dir;
        const side = car.vertical ? Math.abs(dx) : Math.abs(dz);
        if (ahead > 0 && ahead < 9 && side < 3) target = 0;
      }
      car.speed += (target - car.speed) * Math.min(1, 2 * dt);
      const step = car.speed * dt;
      if (car.vertical) car.z += car.dir * step;
      else car.x += car.dir * step;
      // Turn around at the city edge (U-turn onto the next road).
      if (car.vertical && (car.z > 312 || car.z < -312)) {
        car.dir *= -1;
        car.lane = car.lane + (car.dir > 0 ? 80 : -80);
        if (car.lane > 312 || car.lane < -312) car.lane = car.lane > 312 ? -312 + 8 : 312 - 8;
        car.x = car.lane + car.dir * 3.5;
        car.angle = car.dir > 0 ? 0 : Math.PI;
      }
      if (!car.vertical && (car.x > 312 || car.x < -312)) {
        car.dir *= -1;
        car.lane = car.lane + (car.dir > 0 ? 80 : -80);
        if (car.lane > 312 || car.lane < -312) car.lane = car.lane > 312 ? -312 + 8 : 312 - 8;
        car.z = car.lane + car.dir * 3.5;
        car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.angle;
      for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.4;
    }
  }

  nearestStealable(x, z, maxDist) {
    let best = null, bestD = maxDist;
    for (const car of this.cars) {
      if (car.driven || car.broken) continue;
      const d = Math.hypot(car.x - x, car.z - z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }
}
