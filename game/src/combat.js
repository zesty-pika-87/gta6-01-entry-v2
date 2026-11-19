// Combat: fists up close, a pistol at range. Enemies are rival crew
// members during missions; the player has health, a short invulnerability
// window after being hit, and a combo CHAIN that grows with every hit
// landed without taking damage.

import * as THREE from 'three';

export class Combat {
  constructor(scene, particles, sfx, feel) {
    this.scene = scene;
    this.particles = particles;
    this.sfx = sfx;
    this.feel = feel;
    this.enemies = [];
    this.bullets = [];
    this.playerHealth = 100;
    this.invuln = 0;
    this.chain = 0;
    this.chainTimer = 0;
    this.bestChain = 0;
    this.cooldown = 0;
  }

  spawnEnemy(x, z, hp) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.45), new THREE.MeshLambertMaterial({ color: 0x8a2a2a }));
    body.position.y = 1.0;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), new THREE.MeshLambertMaterial({ color: 0xc98a5a }));
    head.position.y = 1.8;
    g.add(head);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    gun.position.set(0.4, 1.2, 0.4);
    g.add(gun);
    g.position.set(x, 0, z);
    this.scene.add(g);
    const e = { mesh: g, x, z, hp: hp || 3, shootTimer: 1 + Math.random(), alive: true };
    this.enemies.push(e);
    return e;
  }

  clearEnemies() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
  }

  punch(playerPos, playerAngle) {
    if (this.cooldown > 0) return;
    this.cooldown = 0.35;
    this.sfx.punch();
    const hx = playerPos.x + Math.sin(playerAngle) * 1.6;
    const hz = playerPos.z + Math.cos(playerAngle) * 1.6;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - hx, e.z - hz) < 1.6) {
        this.hitEnemy(e, 1, playerPos);
      }
    }
    this.particles.burst({ x: hx, y: 1.2, z: hz }, 0xffffff, 8, 3);
  }

  shoot(playerPos, playerAngle) {
    if (this.cooldown > 0) return;
    this.cooldown = 0.28;
    this.sfx.shoot();
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    g.add(m);
    const sx = playerPos.x + Math.sin(playerAngle) * 1.2;
    const sz = playerPos.z + Math.cos(playerAngle) * 1.2;
    g.position.set(sx, 1.3, sz);
    this.scene.add(g);
    this.bullets.push({ mesh: g, x: sx, z: sz, dx: Math.sin(playerAngle), dz: Math.cos(playerAngle), life: 1.2 });
  }

  hitEnemy(e, dmg, playerPos) {
    e.hp -= dmg;
    this.chain += 1;
    this.chainTimer = 4;
    if (this.chain > this.bestChain) this.bestChain = this.chain;
    this.feel.popup(this.chain > 1 ? `${this.chain} CHAIN` : 'HIT!', '#ffc94d');
    this.feel.shake(0.12, 0.12);
    this.particles.burst({ x: e.x, y: 1.4, z: e.z }, 0xff5a4d, 12, 5);
    if (e.hp <= 0) {
      e.alive = false;
      e.mesh.rotation.x = Math.PI / 2;
      e.mesh.position.y = 0.4;
      this.particles.burst({ x: e.x, y: 1, z: e.z }, 0xffc94d, 26, 7);
      this.sfx.coin();
    }
  }

  hurtPlayer(amount) {
    if (this.invuln > 0) return;
    this.playerHealth -= amount;
    this.invuln = 0.9;
    this.chain = 0;
    this.feel.shake(0.35, 0.25);
    this.feel.freeze(0.05);
  }

  update(dt, playerPos) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.chainTimer > 0) {
      this.chainTimer -= dt;
      if (this.chainTimer <= 0) this.chain = 0;
    }
    // Bullets fly straight and hit the first enemy in their path.
    for (const b of this.bullets) {
      b.x += b.dx * 55 * dt;
      b.z += b.dz * 55 * dt;
      b.life -= dt;
      b.mesh.position.set(b.x, 1.3, b.z);
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - b.x, e.z - b.z) < 0.9) {
          this.hitEnemy(e, 1, playerPos);
          b.life = 0;
          break;
        }
      }
    }
    for (const b of this.bullets) {
      if (b.life <= 0) this.scene.remove(b.mesh);
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    // Enemies walk toward the player and shoot when in range.
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = playerPos.x - e.x, dz = playerPos.z - e.z;
      const d = Math.hypot(dx, dz) || 1;
      e.mesh.rotation.y = Math.atan2(dx, dz);
      if (d > 6) {
        e.x += (dx / d) * 3.4 * dt;
        e.z += (dz / d) * 3.4 * dt;
        e.mesh.position.set(e.x, 0, e.z);
      } else {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          e.shootTimer = 1.6 + Math.random() * 0.8;
          this.hurtPlayer(8);
          this.particles.burst({ x: playerPos.x, y: 1.4, z: playerPos.z }, 0xff5a4d, 6, 3);
        }
      }
      if (d < 1.4) this.hurtPlayer(6);
    }
  }
}
