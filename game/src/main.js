// Solara Bay — main game. Wires every system together: the player on
// foot and in cars, the wanted level, 8 story missions, the garage,
// the save, the HUD and the deterministic screenshot staging.

import * as THREE from 'three';
import { Render } from './render.js';
import { World } from './world.js';
import { HUD, HUD_CSS, RANK_NAMES, rankNameFor } from './hud.js';
import { Minimap } from './minimap.js';
import { Particles } from './particles.js';
import { Feel } from './feel.js';
import { Combat } from './combat.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Police } from './police.js';
import { Missions, MISSION_STATE } from './missions.js';
import { spawnParkedCars, Car } from './vehicles.js';
import { makeRng, seedFromUrl } from './random.js';
import { KEYS, initInput, endFrameInput, wasPressed } from './input.js';
import { loadSave, writeSave } from './save.js';
import { ensureAudio, getAudio, sfx, engineSound, sirenSound, setMuted } from './audio.js';
import { startMusic } from './music.js';
import { ECONOMY, PLAYER, WANTED, CITY, PALETTE } from './config.js';
import { INTRO, MISSION_STORIES, OUTRO, TIPS, CHARACTERS } from './story.js';
import { shotFromUrl, applyShot, stageCoverFrame, stageStreetFrame } from './shots.js';

const style = document.createElement('style');
style.textContent = HUD_CSS;
document.head.appendChild(style);

export class Game {
  constructor() {
    this.seed = seedFromUrl();
    this.rng = makeRng(this.seed);
    this.save = loadSave();
    this.mode = 'title'; // title | play | paused | board | garage | dialogue | victory | busted
    this.state = {
      cash: this.save.cash,
      wanted: 0,
      health: PLAYER.health,
      rank: 1 + Math.floor(this.save.missionsDone.length / 2),
      rankName: rankNameFor(this.save.missionsDone.length),
      objective: '',
      subObjective: '',
      chain: 0,
      popups: [],
    };
    this.time = 0;
    this.playSeconds = 0;
    this.shot = shotFromUrl();
    this.framesRendered = 0;
    this.shotReady = false;

    const canvas = document.getElementById('game');
    this.render = new Render(canvas);
    this.world = new World(this.render.scene, this.seed);
    this.particles = new Particles(this.render.scene);
    this.feel = new Feel();
    this.hud = new HUD(document.getElementById('hud'));
    this.minimap = new Minimap(this.hud.minimapCanvas);
    this.traffic = new Traffic(this.render.scene, this.world, this.rng);
    this.peds = new Pedestrians(this.render.scene, this.world, this.rng);
    this.police = new Police(this.render.scene, this.world, this.rng);
    this.combat = new Combat(this.render.scene, this.particles, sfx, this.feel);
    this.missions = new Missions(this.world, this.rng);

    this.traffic.spawn(14);
    this.peds.spawn(26);
    this.parkedCars = spawnParkedCars(this.render.scene, this.world, this.rng, 10);

    // The player, on foot.
    this.player = this.makePlayerMesh();
    this.render.scene.add(this.player.mesh);
    this.player.x = -40; this.player.z = -20;
    this.player.angle = Math.PI;
    this.playerInCar = false;
    this.playerCar = null;
    this.specialCar = null;   // the red Comet of mission 3
    this.crates = [];         // mission 4 crates
    this.missionMarker = null;
    this.markerRing = null;
    this.taxiClient = null;
    this.dialogueOpen = false;
    this.muted = false;

    initInput();
    this.bindMenuClicks();
    this.showTitle();

    // Deterministic screenshot staging: compose the scene, fast-forward
    // the simulation a few seconds, then flag ready for capture.
    if (this.shot) {
      this.mode = 'play';
      this.hud.hideMenu();
      applyShot(this, this.shot);
      // Snap the chase camera behind the staged player/car first, then
      // hold the gas during the fast-forward so the chase is moving.
      this.render.camPos.set(
        this.player.x - Math.sin(this.player.angle) * 13.5,
        5.2,
        this.player.z - Math.cos(this.player.angle) * 13.5,
      );
      this.render.camLook.set(this.player.x, 1.6, this.player.z);
      KEYS.up = true;
      for (let i = 0; i < 200; i++) this.update(1 / 60, true);
      KEYS.up = false;
      if (this.shot === 'cover') stageCoverFrame(this);
      if (this.shot === 'street') stageStreetFrame(this);
      // Re-snap the camera behind the player after the fast-forward, so
      // the staged chase is what the capture sees.
      this.render.camPos.set(
        this.player.x - Math.sin(this.player.angle) * 13.5,
        5.2,
        this.player.z - Math.cos(this.player.angle) * 13.5,
      );
      this.render.camLook.set(this.player.x, 1.6, this.player.z);
      this.render.draw();
      this.framesRendered++;
      window.__shotReady = true;
      this.shotReady = true;
    }

    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!this.shotReady) {
        this.update(dt, false);
        this.render.draw();
        this.framesRendered++;
      } else {
        // In shot mode keep rendering (water shimmer, pulsing marker)
        // but freeze gameplay so the capture is stable.
        this.render.draw();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  makePlayerMesh() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.45), new THREE.MeshLambertMaterial({ color: 0x2a7a5c }));
    body.position.y = 1.0;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), new THREE.MeshLambertMaterial({ color: 0xe8b98a }));
    head.position.y = 1.85;
    g.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 10), new THREE.MeshLambertMaterial({ color: 0xffc94d }));
    cap.position.y = 2.05;
    g.add(cap);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2f38 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.26), legMat);
    legL.position.set(-0.18, 0.35, 0);
    g.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.18;
    g.add(legR);
    return { mesh: g, legL, legR, x: 0, z: 0, angle: 0, phase: 0 };
  }

  // ---- Menus ------------------------------------------------------------
  bindMenuClicks() {
    this.hud.root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      ensureAudio();
      sfx.click();
      const act = btn.dataset.act;
      if (act === 'start') this.startGame();
      else if (act === 'continue') { this.hud.hideMenu(); this.mode = 'play'; }
      else if (act === 'board') this.openMissionBoard();
      else if (act === 'garage') this.openGarage();
      else if (act === 'mission') this.acceptMission(parseInt(btn.dataset.i, 10));
      else if (act === 'buy-car') this.buyCar(btn.dataset.name);
      else if (act === 'upgrade') this.buyUpgrade(btn.dataset.k);
      else if (act === 'restart') this.restartRun();
      else if (act === 'mute') { this.muted = !this.muted; setMuted(this.muted); btn.textContent = this.muted ? 'Unmute sound' : 'Mute sound'; }
      else if (act === 'resume') { this.hud.hideMenu(); this.mode = 'play'; }
    });
  }

  showTitle() {
    this.mode = 'title';
    this.hud.showMenu(`
      <div class="menu-card">
        <h1>SOLARA BAY</h1>
        <p class="sub">An open-world crime story · a sun-soaked city of your own · made for make.fun gta6-01</p>
        <p>${INTRO.join(' ')}</p>
        <p class="sub">8 story missions · steal &amp; drive cars · traffic &amp; pedestrians · wanted 1–5 stars · police chases, roadblocks &amp; helicopter · garage · save</p>
        <button class="menu-btn" data-act="start">▶ Start the story</button>
        <button class="menu-btn ghost" data-act="mute">Mute sound</button>
        <p class="sub">${TIPS.join(' · ')}</p>
      </div>`);
  }

  startGame() {
    ensureAudio();
    const { ctx, master } = getAudio();
    if (ctx && master) { try { startMusic(ctx, master); } catch { /* music is optional */ } }
    this.hud.hideMenu();
    this.mode = 'play';
    this.state.objective = 'Find the mission board at the plaza (gold marker)';
    this.state.subObjective = 'Walk to the plaza · E steals a car · golden shells pay $75';
    this.hud.toast('Welcome to Solara Bay — Mara is waiting at the plaza', 3600);
  }

  openMissionBoard() {
    this.mode = 'board';
    const rows = MISSION_STORIES.map((m, i) => {
      const done = this.save.missionsDone.includes(i);
      const next = this.missions.nextIndex(this.save.missionsDone);
      const canStart = !done && i === next && this.missions.state !== MISSION_STATE.ACTIVE;
      const active = this.missions.current === i && this.missions.state === MISSION_STATE.ACTIVE;
      return `<div class="mission-row${done ? ' done' : ''}">
        <div><b>${i + 1}. ${m.name}</b> — ${CHARACTERS[m.giver].name}<br><span class="sub">${m.brief}</span></div>
        <div class="pay">${done ? '✓ DONE' : active ? 'ACTIVE' : '$' + (350 + i * 150)}</div>
        ${canStart ? `<button class="menu-btn" data-act="mission" data-i="${i}">Start</button>` : ''}
      </div>`;
    }).join('');
    this.hud.showMenu(`
      <div class="menu-card">
        <h2>◆ MISSION BOARD — Solara Bay</h2>
        <p class="sub">Jobs from Mara, Old Sal, The Broker, Lena and friends. Finish all 8 to own the Bay.</p>
        ${rows}
        <button class="menu-btn ghost" data-act="continue">Close (back to the streets)</button>
      </div>`);
  }

  acceptMission(i) {
    const story = this.missions.start(i);
    this.hud.hideMenu();
    this.mode = 'play';
    this.setupMissionWorld();
    this.state.objective = `MISSION ${i + 1} · ${story.name.toUpperCase()} — ${this.missions.objective}`;
    sfx.missionStart();
    this.showDialogue(story.intro, CHARACTERS[story.giver].name, () => { this.dialogueOpen = false; });
    this.dialogueOpen = true;
  }

  openGarage() {
    this.mode = 'garage';
    const owned = this.save.garage.length ? this.save.garage.join(', ') : 'none yet';
    const up = this.save.upgrades || { engine: 0, armor: 0, tires: 0 };
    const upRow = (key, name, desc, price) => {
      const lvl = up[key];
      const maxed = lvl >= 3;
      return `<div class="mission-row"><div><b>${name} — Lv ${lvl}/3</b><br><span class="sub">${desc}</span></div>
        <div class="pay">${maxed ? 'MAX' : '$' + price}</div>
        ${maxed ? '' : `<button class="menu-btn" data-act="upgrade" data-k="${key}">Upgrade</button>`}</div>`;
    };
    this.hud.showMenu(`
      <div class="menu-card">
        <h2>◆ LENA'S GARAGE</h2>
        <p>Your cars: <b>${owned}</b> · Cash: <b>$${Math.floor(this.state.cash)}</b></p>
        <p class="sub">Buy a fresh ride for $${ECONOMY.carPrice}. Bought cars wait here — steal one back on the street any time.</p>
        <div class="mission-row"><div><b>Comet GT</b> — fast, red, loud</div><div class="pay">$${ECONOMY.carPrice}</div><button class="menu-btn" data-act="buy-car" data-name="Comet GT">Buy</button></div>
        <div class="mission-row"><div><b>Dune Runner</b> — beach-ready, roomy</div><div class="pay">$${ECONOMY.carPrice}</div><button class="menu-btn" data-act="buy-car" data-name="Dune Runner">Buy</button></div>
        <h2 style="margin-top:18px">◆ UPGRADES — every car you drive</h2>
        ${upRow('engine', 'Turbo Engine', '+12% top speed per level', 500)}
        ${upRow('armor', 'Steel Plating', '+50 car health per level, survives more rams', 400)}
        ${upRow('tires', 'Grip Tires', '+15% turning per level', 300)}
        <button class="menu-btn ghost" data-act="continue">Back to the streets</button>
      </div>`);
  }

  buyUpgrade(key) {
    const prices = { engine: 500, armor: 400, tires: 300 };
    const up = this.save.upgrades || { engine: 0, armor: 0, tires: 0 };
    if ((up[key] || 0) >= 3) { this.hud.toast('Already maxed out', 2000); return; }
    if (this.state.cash < prices[key]) {
      this.hud.toast('Not enough cash — do a mission first', 2600);
      return;
    }
    this.state.cash -= prices[key];
    up[key] = (up[key] || 0) + 1;
    this.save.upgrades = up;
    this.save.cash = this.state.cash;
    writeSave(this.save);
    sfx.coin();
    this.hud.toast(`${key.toUpperCase()} upgraded to Lv ${up[key]}`, 2600);
    this.openGarage();
  }

  buyCar(name) {
    if (this.state.cash < ECONOMY.carPrice) {
      this.hud.toast('Not enough cash — do a mission first', 2600);
      return;
    }
    this.state.cash -= ECONOMY.carPrice;
    this.save.cash = this.state.cash;
    this.save.garage.push(name);
    writeSave(this.save);
    sfx.coin();
    this.hud.toast(`${name} is yours — parked outside the garage`, 3000);
    this.openGarage();
  }

  showVictory() {
    this.mode = 'victory';
    const done = this.save.missionsDone.length;
    this.state.rank = 1 + Math.floor(done / 2);
    this.state.rankName = rankNameFor(done);
    this.hud.showMenu(`
      <div class="menu-card">
        <h1>SOLARA BAY IS YOURS</h1>
        <p>${OUTRO.join(' ')}</p>
        <div class="stat-grid">
          <div><span>Missions completed</span><b>${done} / 8</b></div>
          <div><span>Cash</span><b>$${Math.floor(this.state.cash).toLocaleString('en-US')}</b></div>
          <div><span>Total earned</span><b>$${Math.floor(this.save.totalEarned || 0).toLocaleString('en-US')}</b></div>
          <div><span>Best CHAIN</span><b>${this.save.bestChain || 0}</b></div>
          <div><span>Cars owned</span><b>${this.save.garage.length}</b></div>
          <div><span>Rank</span><b>${this.state.rankName}</b></div>
        </div>
        <button class="menu-btn" data-act="restart">↻ Play again</button>
        <button class="menu-btn ghost" data-act="continue">Keep cruising</button>
      </div>`);
  }

  showBusted(reason) {
    this.mode = 'busted';
    const fine = Math.min(200, Math.floor(this.state.cash * 0.2));
    this.state.cash -= fine;
    this.save.cash = this.state.cash;
    writeSave(this.save);
    this.hud.showMenu(`
      <div class="menu-card">
        <h2>BUSTED</h2>
        <p>${reason}</p>
        <p class="sub">The Bay PD took $${fine} as a fine and dropped you at the plaza. Your cars are still out there.</p>
        <button class="menu-btn" data-act="continue">Back on the streets</button>
      </div>`);
    // Respawn at the plaza, on foot, clean.
    this.exitCar(true);
    this.player.x = -40; this.player.z = -20;
    this.player.angle = Math.PI;
    this.combat.playerHealth = PLAYER.health;
    this.state.health = PLAYER.health;
    this.police.reset();
    this.state.wanted = 0;
  }

  restartRun() {
    this.save.missionsDone = [];
    this.save.cash = ECONOMY.startCash;
    this.save.garage = [];
    this.save.totalEarned = 0;
    this.save.bestChain = 0;
    writeSave(this.save);
    this.state.cash = ECONOMY.startCash;
    this.state.health = PLAYER.health;
    this.combat.playerHealth = PLAYER.health;
    this.combat.chain = 0;
    this.missions.current = -1;
    this.missions.state = MISSION_STATE.IDLE;
    this.police.reset();
    this.state.wanted = 0;
    this.hud.hideMenu();
    this.mode = 'play';
    this.state.objective = 'Find the mission board at the plaza (gold marker)';
  }

  showDialogue(lines, speaker, onDone) {
    this.mode = 'dialogue';
    this.hud.showDialogue(lines, speaker, () => {
      this.mode = 'play';
      onDone && onDone();
    });
  }

  // ---- Missions: world setup per job ------------------------------------
  setupMissionWorld() {
    const d = this.missions.def;
    this.clearMissionProps();
    if (d.type === 'fight') {
      for (let i = 0; i < d.enemies; i++) {
        const a = this.rng.range(0, Math.PI * 2);
        this.combat.spawnEnemy(d.at.x + Math.sin(a) * 8, d.at.z + Math.cos(a) * 8, 3);
      }
    }
    if (d.type === 'stealCar') {
      // The red Comet, parked on the beach road.
      this.specialCar = new Car(this.render.scene, d.at.x, d.at.z, Math.PI / 2, 0xd84a3a, 'Comet', 'civilian');
      this.parkedCars.push(this.specialCar);
    }
    if (d.type === 'collect') {
      const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
      const mat = new THREE.MeshLambertMaterial({ color: 0x8a5a2a });
      for (let i = 0; i < d.count; i++) {
        const m = new THREE.Mesh(geo, mat);
        const x = d.at.x + this.rng.range(-14, 14);
        const z = d.at.z + this.rng.range(-14, 14);
        m.position.set(x, 0.8, z);
        this.render.scene.add(m);
        this.crates.push({ mesh: m, x, z, taken: false });
      }
    }
    if (d.type === 'roadblock') {
      this.police.spawnRoadblock({ x: d.at.x, z: d.at.z });
      this.police.wanted = Math.max(this.police.wanted, 2);
    }
    if (d.type === 'taxi') {
      // The nervous client waits at the plaza.
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), new THREE.MeshLambertMaterial({ color: 0x2a2f38 }));
      body.position.y = 1.05; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), new THREE.MeshLambertMaterial({ color: 0xd8a0a0 }));
      head.position.y = 1.75; g.add(head);
      g.position.set(d.pickup.x + 4, 0, d.pickup.z + 4);
      this.render.scene.add(g);
      this.taxiClient = g;
    }
    this.updateMarker();
  }

  clearMissionProps() {
    for (const c of this.crates) this.render.scene.remove(c.mesh);
    this.crates = [];
    this.combat.clearEnemies();
    if (this.taxiClient) { this.render.scene.remove(this.taxiClient); this.taxiClient = null; }
    if (this.markerRing) { this.render.scene.remove(this.markerRing); this.markerRing = null; }
    this.missionMarker = null;
  }

  updateMarker() {
    if (this.markerRing) { this.render.scene.remove(this.markerRing); this.markerRing = null; }
    const wp = this.missions.currentWaypoint;
    if (!wp || this.missions.state !== MISSION_STATE.ACTIVE) return;
    this.missionMarker = wp;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3, 4.2, 32),
      new THREE.MeshBasicMaterial({ color: 0xffc94d, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(wp.x, 0.15, wp.z);
    this.render.scene.add(ring);
    this.markerRing = ring;
    // A tall light beam so the waypoint reads from anywhere.
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.4, 60, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc94d, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.set(wp.x, 30, wp.z);
    this.render.scene.add(beam);
    this.markerRing.userData = { beam };
  }

  startMission(i) {
    const story = this.missions.start(i);
    this.setupMissionWorld();
    this.state.objective = `MISSION ${i + 1} · ${story.name.toUpperCase()} — ${this.missions.objective}`;
    return story;
  }

  completeMission() {
    const i = this.missions.current;
    const payout = this.missions.complete();
    this.save.missionsDone.push(i);
    this.state.cash += payout;
    this.save.cash = this.state.cash;
    this.save.totalEarned = (this.save.totalEarned || 0) + payout;
    if (this.combat.bestChain > (this.save.bestChain || 0)) this.save.bestChain = this.combat.bestChain;
    this.save.rank = 1 + Math.floor(this.save.missionsDone.length / 2);
    writeSave(this.save);
    this.state.rank = this.save.rank;
    this.state.rankName = rankNameFor(this.save.missionsDone.length);
    sfx.missionDone();
    this.particles.confetti({ x: this.player.x, y: 1, z: this.player.z });
    this.feel.popup(`+$${payout}`, '#7ed957');
    const story = MISSION_STORIES[i];
    this.clearMissionProps();
    if (this.save.missionsDone.length >= 8) {
      this.showVictory();
      return;
    }
    this.state.objective = `Mission complete: ${story.name} — $${payout}. Next job at the mission board.`;
    this.state.subObjective = 'Drive to the plaza · gold marker';
    this.hud.toast(`✓ ${story.name} complete — $${payout} earned`, 3400);
  }

  // ---- Car enter / exit ---------------------------------------------------
  enterCar(car) {
    this.playerCar = car;
    car.driven = true;
    // Garage upgrades apply to every car the player drives.
    const up = this.save.upgrades || { engine: 0, armor: 0, tires: 0 };
    car.boost = 1 + (up.engine || 0) * 0.12;
    car.grip = 1 + (up.tires || 0) * 0.15;
    car.health = 100 + (up.armor || 0) * 50;
    car.broken = false;
    this.playerInCar = true;
    this.player.mesh.visible = false;
    sfx.door();
    engineSound(0, true);
    const stolen = car.kind === 'civilian';
    if (stolen) {
      const r = this.police.addWanted(WANTED.stealCar, 'car theft');
      if (r.raised) { sfx.wantedUp(); this.hud.toast('WANTED ★ — car theft!', 2200); }
    }
    // Mission 3: stealing the red Comet advances the job.
    if (this.missions.state === MISSION_STATE.ACTIVE && this.missions.def.type === 'stealCar' && car === this.specialCar) {
      this.missions.advance();
      this.state.objective = `MISSION 4 · HOT WHEELS — ${this.missions.objective}`;
      this.updateMarker();
      sfx.checkpoint();
    }
  }

  exitCar(force) {
    if (!this.playerCar) return;
    const car = this.playerCar;
    car.driven = false;
    car.speed = 0;
    this.player.x = car.x + Math.cos(car.angle) * 2.4;
    this.player.z = car.z - Math.sin(car.angle) * 2.4;
    this.player.angle = car.angle;
    this.player.mesh.visible = true;
    this.playerCar = null;
    this.playerInCar = false;
    engineSound(0, false);
    sfx.door();
  }

  // ---- Per-frame update ---------------------------------------------------
  update(dt, fastForward) {
    this.time += dt;
    if (this.mode === 'play' || this.mode === 'dialogue') this.playSeconds += dt;

    // Pause toggle.
    if (!fastForward && wasPressed('pause') && (this.mode === 'play' || this.mode === 'paused')) {
      if (this.mode === 'play') {
        this.mode = 'paused';
        this.hud.showMenu(`<div class="menu-card"><h2>Paused</h2><p>Solara Bay waits for no one — except right now.</p>
          <button class="menu-btn" data-act="resume">Resume</button>
          <button class="menu-btn ghost" data-act="board">Mission board</button>
          <button class="menu-btn ghost" data-act="garage">Garage</button></div>`);
      } else {
        this.hud.hideMenu();
        this.mode = 'play';
      }
    }

    const inPlay = this.mode === 'play' || this.mode === 'dialogue' || fastForward;
    const feel = this.feel.update(dt);

    if (inPlay) {
      // During dialogue the world keeps moving but the player cannot act,
      // so pressing E to advance a line never also steals a car.
      if (this.mode === 'play' || fastForward) this.updatePlayer(dt);
      this.updateMissions(dt);
      this.updateWorld(dt);
    }

    // Camera always follows, even on menus (slow orbit on the title).
    const focus = { x: this.player.x, z: this.player.z, angle: this.player.angle };
    if (this.mode === 'title') {
      const t = this.time * 0.05;
      this.render.camera.position.set(Math.sin(t) * 160, 90, Math.cos(t) * 160);
      this.render.camera.lookAt(0, 0, 0);
    } else {
      this.render.update(dt, { x: focus.x, z: focus.z }, focus.angle, this.playerInCar, feel);
    }

    // HUD + minimap.
    this.state.wanted = Math.ceil(this.police.wanted);
    this.state.health = this.combat.playerHealth;
    this.state.chain = this.combat.chain;
    this.state.popups = this.feel.popups;
    this.hud.update(this.state);
    this.minimap.draw({
      player: { x: this.player.x, z: this.player.z, angle: this.player.angle },
      waypoint: this.missions.state === MISSION_STATE.ACTIVE ? this.missions.currentWaypoint : null,
      police: this.police.cars,
      traffic: this.traffic.cars,
    });

    // Audio beds.
    if (!fastForward) {
      const speed01 = this.playerCar ? Math.abs(this.playerCar.speed) / 38 : 0;
      engineSound(speed01, this.playerInCar);
      sirenSound(this.police.wanted >= 1);
    }
    endFrameInput();
  }

  updatePlayer(dt) {
    const p = this.player;
    if (this.playerInCar && this.playerCar) {
      const car = this.playerCar;
      const throttle = (KEYS.up ? 1 : 0) + (KEYS.down ? -1 : 0);
      const steer = (KEYS.right ? 1 : 0) + (KEYS.left ? -1 : 0);
      car.update(dt, { throttle, steer }, this.world);
      p.x = car.x; p.z = car.z; p.angle = car.angle;
      // Hitting a pedestrian with the car.
      const hit = this.peds.hitAt(car.x, car.z, 2.2);
      if (hit && Math.abs(car.speed) > 4) {
        this.peds.knockDown(hit);
        const r = this.police.addWanted(WANTED.hitPed, 'hit pedestrian');
        if (r.raised) sfx.wantedUp();
        sfx.crash();
        this.feel.shake(0.3, 0.2);
        this.particles.burst({ x: hit.x, y: 1, z: hit.z }, 0xff5a4d, 16, 5);
      }
      // Ramming a police car (once a second per car at most).
      for (const cop of this.police.cars) {
        if (cop.ramCd > 0) cop.ramCd -= dt;
        if (cop.ramCd <= 0 && Math.hypot(cop.x - car.x, cop.z - car.z) < 3.4 && Math.abs(car.speed) > 8) {
          cop.ramCd = 1;
          cop.damage(40);
          car.speed *= 0.5;
          sfx.crash();
          this.feel.shake(0.4, 0.25);
          this.particles.burst({ x: cop.x, y: 1, z: cop.z }, 0xffc94d, 20, 6);
          if (cop.broken) {
            this.police.addWanted(WANTED.killCop, 'disabled police car');
            this.feel.popup('COP DOWN +$150', '#7ed957');
            this.state.cash += 150;
          }
        }
      }
      // Roadblock smash (mission 6).
      for (const rb of this.police.roadblocks) {
        if (!rb.broken && Math.hypot(rb.x - car.x, rb.z - car.z) < 3.6 && Math.abs(car.speed) > 10) {
          rb.damage(200);
          car.speed *= 0.6;
          sfx.crash();
          this.feel.shake(0.5, 0.3);
          this.particles.burst({ x: rb.x, y: 1, z: rb.z }, 0xffc94d, 26, 7);
        }
      }
      if (wasPressed('action')) this.exitCar();
      if (wasPressed('horn')) sfx.horn();
    } else {
      // On foot.
      const run = KEYS.run;
      const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      if (KEYS.left) p.angle -= 2.6 * dt;
      if (KEYS.right) p.angle += 2.6 * dt;
      let mx = 0, mz = 0;
      if (KEYS.up) { mx += Math.sin(p.angle); mz += Math.cos(p.angle); }
      if (KEYS.down) { mx -= Math.sin(p.angle); mz -= Math.cos(p.angle); }
      const len = Math.hypot(mx, mz);
      if (len > 0) {
        const nx = p.x + (mx / len) * speed * dt;
        const nz = p.z + (mz / len) * speed * dt;
        const r = this.world.resolveCollision(nx, nz, PLAYER.radius);
        p.x = r.x; p.z = r.z;
        p.phase += dt * speed * 1.6;
        p.legL.rotation.x = Math.sin(p.phase) * 0.6;
        p.legR.rotation.x = -Math.sin(p.phase) * 0.6;
      }
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.angle;
      // Enter / steal a car.
      if (wasPressed('action')) {
        const nearParked = this.parkedCars.find((c) => !c.driven && Math.hypot(c.x - p.x, c.z - p.z) < 3.5);
        const nearTraffic = this.traffic.nearestStealable(p.x, p.z, 3.5);
        const nearSpecial = this.specialCar && !this.specialCar.driven && Math.hypot(this.specialCar.x - p.x, this.specialCar.z - p.z) < 3.5 ? this.specialCar : null;
        const car = nearSpecial || nearParked || nearTraffic;
        if (car) {
          if (car === nearTraffic) {
            // Pull it out of traffic.
            const i = this.traffic.cars.indexOf(car);
            if (i >= 0) this.traffic.cars.splice(i, 1);
            this.parkedCars.push(car);
          }
          this.enterCar(car);
        } else if (Math.hypot(p.x - this.world.missionBoardPos.x, p.z - this.world.missionBoardPos.z) < 6) {
          this.openMissionBoard();
        } else if (Math.hypot(p.x - this.world.garagePos.x, p.z - this.world.garagePos.z) < 14) {
          this.openGarage();
        }
      }
      if (wasPressed('punch')) this.combat.punch({ x: p.x, z: p.z }, p.angle);
      if (wasPressed('shoot')) this.combat.shoot({ x: p.x, z: p.z }, p.angle);
      // Golden shells.
      for (const c of this.world.collectibles) {
        if (!c.taken && Math.hypot(c.x - p.x, c.z - p.z) < 2.2) {
          c.taken = true;
          c.mesh.visible = false;
          this.state.cash += ECONOMY.collectible;
          this.save.cash = this.state.cash;
          writeSave(this.save);
          sfx.pickup();
          this.feel.popup(`+$${ECONOMY.collectible} SHELL`, '#ffc94d');
          this.particles.burst({ x: c.x, y: 1, z: c.z }, 0xffc94d, 14, 4);
        }
      }
    }
    // Health / busted.
    if (this.combat.playerHealth <= 0) {
      this.showBusted('You got wasted — the Bay PD scraped you off the asphalt.');
    }
  }

  updateMissions(dt) {
    if (this.missions.state !== MISSION_STATE.ACTIVE) return;
    const d = this.missions.def;
    const p = this.player;
    const at = (x, z, r) => Math.hypot(p.x - x, p.z - z) < r;
    if (d.type === 'steal') {
      if (this.missions.step === 0 && this.playerInCar) {
        this.missions.advance();
        this.state.objective = `MISSION 1 · FIRST LIGHT — ${this.missions.objective}`;
        this.updateMarker();
        sfx.checkpoint();
      } else if (this.missions.step === 1 && this.playerInCar && at(d.target.x, d.target.z, 8)) {
        this.completeMission();
      }
    } else if (d.type === 'deliver') {
      if (this.missions.step === 0 && at(d.pickup.x, d.pickup.z, 6)) {
        this.missions.advance();
        this.state.objective = `MISSION 2 · THE BROKER'S ERRAND — ${this.missions.objective}`;
        this.updateMarker();
        sfx.checkpoint();
      } else if (this.missions.step === 1 && at(d.target.x, d.target.z, 10)) {
        this.completeMission();
      }
    } else if (d.type === 'fight') {
      const alive = this.combat.enemies.filter((e) => e.alive).length;
      this.state.subObjective = `Crew left: ${alive}`;
      if (alive === 0) this.completeMission();
    } else if (d.type === 'stealCar') {
      if (this.missions.step === 1 && this.playerInCar && this.playerCar === this.specialCar && at(d.target.x, d.target.z, 12)) {
        this.completeMission();
      }
    } else if (d.type === 'collect') {
      let got = 0;
      for (const c of this.crates) {
        if (!c.taken && at(c.x, c.z, 2.5)) {
          c.taken = true;
          c.mesh.visible = false;
          sfx.pickup();
          this.particles.burst({ x: c.x, y: 1, z: c.z }, 0xffc94d, 14, 4);
        }
        if (c.taken) got++;
      }
      this.state.subObjective = `Crates: ${got} / ${d.count}`;
      if (got >= d.count) this.completeMission();
    } else if (d.type === 'taxi') {
      if (this.missions.step === 0) {
        if (this.playerInCar && at(d.pickup.x, d.pickup.z, 7)) {
          if (this.taxiClient) { this.render.scene.remove(this.taxiClient); this.taxiClient = null; }
          this.missions.advance();
          this.state.objective = `MISSION 6 · THE LONG WAY HOME — ${this.missions.objective}`;
          this.updateMarker();
          sfx.checkpoint();
          this.hud.toast('Client aboard — no stars, no scratches!', 2600);
        }
      } else if (this.missions.step === 1 && at(d.target.x, d.target.z, 8)) {
        if (this.police.wanted >= 1) {
          this.state.subObjective = 'Lose the stars first — the client hates sirens!';
        } else {
          this.completeMission();
        }
      }
    } else if (d.type === 'roadblock') {
      const left = this.police.roadblocks.filter((c) => !c.broken).length;
      this.state.subObjective = `Roadblock cars left: ${left}`;
      if (this.police.roadblocks.length > 0 && left === 0) {
        this.police.wanted = Math.max(0, this.police.wanted - 1);
        this.completeMission();
      }
    }
    // Marker pulse.
    if (this.markerRing) {
      const s = 1 + Math.sin(this.time * 4) * 0.12;
      this.markerRing.scale.set(s, s, 1);
    }
  }

  updateWorld(dt) {
    const p = this.player;
    const threats = [];
    if (this.playerInCar && this.playerCar) threats.push({ x: p.x, z: p.z, radius: 10 });
    if (this.combat.bullets.length) threats.push({ x: p.x, z: p.z, radius: 14 });
    this.traffic.update(dt, this.playerCar, null);
    this.peds.update(dt, threats);
    this.police.update(dt, { x: p.x, z: p.z }, this.playerInCar,
      () => this.showBusted('The Bay PD caught you on foot.'),
      (car) => {
        // Police ram: shake + damage the player's car or health.
        this.feel.shake(0.25, 0.15);
        if (this.playerInCar && this.playerCar) {
          this.playerCar.damage(12);
          if (this.playerCar.broken) { this.exitCar(true); this.hud.toast('Your car is wrecked!', 2400); }
        } else {
          this.combat.hurtPlayer(10);
        }
      });
    this.combat.update(dt, { x: p.x, z: p.z });
    this.particles.update(dt);
    // Bob the golden shells.
    for (const c of this.world.collectibles) {
      if (!c.taken) {
        c.mesh.rotation.y += dt * 2;
        c.mesh.position.y = 1.2 + Math.sin(this.time * 2 + c.x) * 0.25;
      }
    }
  }
}

// Boot.
const game = new Game();
window.__solara = game;
