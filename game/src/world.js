// World: the procedural city of Solara Bay. An 8x8 block grid of roads,
// seeded buildings with lit windows, a palm-lined beach and a golden-hour
// sea to the east, plus the road graph traffic drives on and the
// colliders the player and cars bump into.

import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';
import { makeRng } from './random.js';

const PITCH = CITY.blockSize + CITY.roadWidth; // 80 m from road centre to road centre
const HALF = CITY.size / 2;                    // 320

// Road centre lines, in world coordinates.
export function roadCenters() {
  const out = [];
  for (let i = 0; i <= CITY.blocks; i++) out.push(-HALF + i * PITCH + CITY.roadWidth / 2 + (i === 0 ? 0 : 0));
  return out;
}

// The road grid: roads run at x = -320 + i*80 + 8 ... simpler: roads are
// centred on lines spaced PITCH apart, offset by half a pitch from origin.
export function roadLines() {
  const lines = [];
  for (let i = 0; i <= CITY.blocks; i++) {
    lines.push(-HALF + CITY.roadWidth / 2 + i * PITCH);
  }
  return lines;
}

function buildingWindowTexture(rng) {
  // One shared canvas texture: warm windows on a dusk facade.
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#20242e';
  g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 6; x < 58; x += 10) {
      const lit = rng.chance(0.45);
      g.fillStyle = lit ? (rng.chance(0.7) ? '#ffd27a' : '#9fd8ff') : '#12151d';
      g.fillRect(x, y, 6, 8);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class World {
  constructor(scene, seed) {
    this.scene = scene;
    this.rng = makeRng(seed);
    this.colliders = []; // {x, z, r} circles + {minX,maxX,minZ,maxZ} boxes
    this.buildingBoxes = [];
    this.roadGraph = []; // {x, z, dir} nodes traffic follows
    this.palmPositions = [];
    this.collectibles = [];
    this.garagePos = { x: -200, z: 200 };
    this.missionBoardPos = { x: -40, z: -40 };
    this.build();
  }

  build() {
    const rng = this.rng;
    const scene = this.scene;
    const lines = roadLines();

    // --- Sky, sun, fog, lights -------------------------------------------
    scene.background = new THREE.Color(PALETTE.skyHorizon);
    scene.fog = new THREE.Fog(0xf2a35e, 260, 900);
    const hemi = new THREE.HemisphereLight(0xffe0b3, 0x3a4a5a, 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffc27a, 2.2);
    sun.position.set(-180, 140, -120);
    sun.castShadow = false;
    scene.add(sun);
    // Low golden sun disc on the horizon, east over the sea.
    const sunBall = new THREE.Mesh(
      new THREE.SphereGeometry(26, 16, 16),
      new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false }),
    );
    sunBall.position.set(420, 55, -60);
    scene.add(sunBall);

    // --- Ground: grass base, asphalt roads, sand beach, sea ---------------
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY.size + 260, CITY.size + 260),
      new THREE.MeshLambertMaterial({ color: PALETTE.grass }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(40, -0.05, 0);
    scene.add(ground);

    const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.asphalt });
    const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
    const lineMat = new THREE.MeshBasicMaterial({ color: PALETTE.asphaltLine });

    for (const c of lines) {
      // Vertical roads (along z)
      const v = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, CITY.size), roadMat);
      v.rotation.x = -Math.PI / 2; v.position.set(c, 0, 0);
      scene.add(v);
      const h = new THREE.Mesh(new THREE.PlaneGeometry(CITY.size, CITY.roadWidth), roadMat);
      h.rotation.x = -Math.PI / 2; h.position.set(0, 0, c);
      scene.add(h);
      // Centre dashes.
      for (let d = -HALF + 20; d < HALF; d += 32) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 8), lineMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(c, 0.02, d);
        scene.add(dash);
        const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.2), lineMat);
        dash2.rotation.x = -Math.PI / 2; dash2.position.set(d, 0.02, c);
        scene.add(dash2);
      }
    }

    // Sidewalk strips around every block.
    for (let bx = 0; bx < CITY.blocks; bx++) {
      for (let bz = 0; bz < CITY.blocks; bz++) {
        const cx = -HALF + CITY.roadWidth + bx * PITCH + CITY.blockSize / 2;
        const cz = -HALF + CITY.roadWidth + bz * PITCH + CITY.blockSize / 2;
        const walk = new THREE.Mesh(
          new THREE.PlaneGeometry(CITY.blockSize + 6, CITY.blockSize + 6), walkMat);
        walk.rotation.x = -Math.PI / 2;
        walk.position.set(cx, 0.01, cz);
        scene.add(walk);
      }
    }

    // Beach + sea on the east edge.
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY.beachWidth, CITY.size),
      new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(CITY.seaAt - CITY.beachWidth / 2, 0.02, 0);
    scene.add(sand);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(600, CITY.size + 260),
      new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(CITY.seaAt + 300, -0.4, 0);
    scene.add(sea);
    // Gentle animated surf line is drawn by render.js via the sea mesh.

    // --- Buildings --------------------------------------------------------
    const winTex = buildingWindowTexture(rng);
    const facadeCols = [PALETTE.buildingA, PALETTE.buildingB, PALETTE.buildingC, PALETTE.buildingD, PALETTE.buildingE];
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const glassGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let bx = 0; bx < CITY.blocks; bx++) {
      for (let bz = 0; bz < CITY.blocks; bz++) {
        const cx = -HALF + CITY.roadWidth + bx * PITCH + CITY.blockSize / 2;
        const cz = -HALF + CITY.roadWidth + bz * PITCH + CITY.blockSize / 2;
        // Skip the plaza block in the middle: mission board + open square.
        if (bx === 4 && bz === 4) continue;
        // Skip the garage block (south-west) so cars can park there.
        if (bx === 1 && bz === 6) continue;
        const n = rng.int(2, 4);
        for (let k = 0; k < n; k++) {
          const w = rng.range(10, 18);
          const d = rng.range(10, 18);
          // Taller towers near the centre, low blocks near the beach.
          const centreBoost = (bx >= 3 && bx <= 4 && bz >= 3 && bz <= 4) ? 1.7 : 1;
          const beachShrink = bx >= 6 ? 0.65 : 1;
          const h = rng.range(9, 42) * (rng.chance(0.12) ? 1.8 : 1) * centreBoost * beachShrink;
          const ox = rng.range(-16, 16);
          const oz = rng.range(-16, 16);
          const x = cx + ox, z = cz + oz;
          const mat = new THREE.MeshLambertMaterial({ color: rng.pick(facadeCols) });
          const b = new THREE.Mesh(boxGeo, mat);
          b.scale.set(w, h, d);
          b.position.set(x, h / 2, z);
          scene.add(b);
          // Lit window band: a sleeve just proud of the facade so the
          // windows read instead of hiding inside the building.
          const glass = new THREE.Mesh(glassGeo, new THREE.MeshBasicMaterial({ map: winTex }));
          glass.scale.set(w + 0.3, Math.min(h * 0.85, 26), d + 0.3);
          glass.position.set(x, h / 2 + 1, z);
          scene.add(glass);
          // Roof variety: flat plant box, pyramid cap, or a round water tower.
          const roofRoll = rng.next();
          if (roofRoll < 0.3) {
            const roof = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x4a4a55 }));
            roof.scale.set(w * 0.4, 2.5, d * 0.4);
            roof.position.set(x, h + 1.2, z);
            scene.add(roof);
          } else if (roofRoll < 0.55) {
            const pyramid = new THREE.Mesh(
              new THREE.ConeGeometry(Math.max(w, d) * 0.62, rng.range(3, 7), 4),
              new THREE.MeshLambertMaterial({ color: rng.pick([0x8a4a3a, 0x3a5a6a, 0x6a6a4a]) }),
            );
            pyramid.position.set(x, h + pyramid.geometry.parameters.height / 2, z);
            pyramid.rotation.y = Math.PI / 4;
            scene.add(pyramid);
          } else if (roofRoll < 0.75) {
            const tank = new THREE.Mesh(
              new THREE.CylinderGeometry(2.2, 2.2, 3.4, 8),
              new THREE.MeshLambertMaterial({ color: 0x7a6a5a }),
            );
            tank.position.set(x, h + 3.2, z);
            scene.add(tank);
            const cone = new THREE.Mesh(
              new THREE.ConeGeometry(2.4, 1.6, 8),
              new THREE.MeshLambertMaterial({ color: 0x5a4a3a }),
            );
            cone.position.set(x, h + 5.6, z);
            scene.add(cone);
          }
          // Neon billboard on tall buildings, facing the nearest road.
          if (h > 30 && rng.chance(0.45)) {
            const bill = new THREE.Mesh(
              new THREE.BoxGeometry(w * 0.7, 3, 0.4),
              new THREE.MeshBasicMaterial({ color: rng.pick([0xff5a8a, 0x37d8ff, 0xffe066, 0x9dff7a]) }),
            );
            bill.position.set(x, h - 2, z + d / 2 + 0.3);
            scene.add(bill);
          }
          this.buildingBoxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
          this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
        }
      }
    }

    // --- Plaza (mission board) --------------------------------------------
    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(26, 24),
      new THREE.MeshLambertMaterial({ color: 0xd8cdb8 }),
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(this.missionBoardPos.x, 0.03, this.missionBoardPos.z);
    scene.add(plaza);
    // Mission board: a tall notice board with a glowing marker.
    const board = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), new THREE.MeshLambertMaterial({ color: 0x6a4a2a }));
    post.position.y = 2.5; board.add(post);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, 0.3), new THREE.MeshLambertMaterial({ color: 0x2e3a4a }));
    panel.position.y = 5.4; board.add(panel);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.6, 0.1), new THREE.MeshBasicMaterial({ color: 0xffc94d }));
    sign.position.set(0, 5.4, 0.18); board.add(sign);
    board.position.set(this.missionBoardPos.x, 0, this.missionBoardPos.z);
    scene.add(board);
    this.colliders.push({ minX: this.missionBoardPos.x - 1, maxX: this.missionBoardPos.x + 1, minZ: this.missionBoardPos.z - 1, maxZ: this.missionBoardPos.z + 1 });

    // --- Garage (south-west block) ----------------------------------------
    const garage = new THREE.Group();
    const gBase = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 18), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
    gBase.position.y = 4; garage.add(gBase);
    const gDoor = new THREE.Mesh(new THREE.BoxGeometry(20, 5.5, 0.4), new THREE.MeshLambertMaterial({ color: 0x3a3f4a }));
    gDoor.position.set(0, 2.8, 9.1); garage.add(gDoor);
    const gSign = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 0.4), new THREE.MeshBasicMaterial({ color: 0xff5a4d }));
    gSign.position.set(0, 7.4, 9.1); garage.add(gSign);
    garage.position.set(this.garagePos.x, 0, this.garagePos.z);
    scene.add(garage);
    this.colliders.push({ minX: this.garagePos.x - 13, maxX: this.garagePos.x + 13, minZ: this.garagePos.z - 9, maxZ: this.garagePos.z + 9 });

    // --- Palms along the beach and plaza ----------------------------------
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 7, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: PALETTE.trunk });
    const leafGeo = new THREE.ConeGeometry(3.2, 3.4, 6);
    const leafMat = new THREE.MeshLambertMaterial({ color: PALETTE.palm });
    const palmAt = (x, z) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 3.5;
      trunk.rotation.z = rng.range(-0.12, 0.12);
      g.add(trunk);
      const leaves = new THREE.Mesh(leafGeo, leafMat);
      leaves.position.y = 8; g.add(leaves);
      g.position.set(x, 0, z);
      scene.add(g);
      this.palmPositions.push({ x, z });
      this.colliders.push({ x, z, r: 0.8 });
    };
    for (let z = -HALF + 20; z < HALF; z += 40) {
      palmAt(CITY.seaAt - CITY.beachWidth - 4, z + rng.range(-6, 6));
      palmAt(CITY.seaAt - 6, z + 18);
    }
    for (let i = 0; i < 10; i++) {
      palmAt(this.missionBoardPos.x + rng.range(-30, 30), this.missionBoardPos.z + rng.range(-30, 30));
    }

    // --- Street lamps ------------------------------------------------------
    const lampMat = new THREE.MeshLambertMaterial({ color: 0x2a2f38 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    for (const c of lines) {
      for (let d = -HALF + 40; d < HALF; d += 80) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), lampMat);
        pole.position.set(c + 7, 3, d);
        scene.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), bulbMat);
        bulb.position.set(c + 7, 6.2, d);
        scene.add(bulb);
        this.colliders.push({ x: c + 7, z: d, r: 0.4 });
      }
    }

    // --- Street props: hydrants, stop signs, benches, trees, bus stops ---
    // They make the sidewalks read as a lived-in city, not an empty grid.
    const hydrantMat = new THREE.MeshLambertMaterial({ color: 0xd83a2a });
    const signMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
    const benchMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
    const treeTrunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a22 });
    const treeLeafMat = new THREE.MeshLambertMaterial({ color: 0x4a7a3a });
    const propAt = (x, z, kind) => {
      if (kind === 'hydrant') {
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.9, 8), hydrantMat);
        h.position.set(x, 0.45, z);
        scene.add(h);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), hydrantMat);
        cap.position.set(x, 0.95, z);
        scene.add(cap);
        this.colliders.push({ x, z, r: 0.5 });
      } else if (kind === 'stop') {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), signMat);
        pole.position.set(x, 1.3, z);
        scene.add(pole);
        const oct = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 8), new THREE.MeshLambertMaterial({ color: 0xc22a1a }));
        oct.rotation.x = Math.PI / 2;
        oct.position.set(x, 2.8, z);
        scene.add(oct);
        this.colliders.push({ x, z, r: 0.3 });
      } else if (kind === 'bench') {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.7), benchMat);
        seat.position.set(x, 0.55, z);
        scene.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.12), benchMat);
        back.position.set(x, 0.95, z - 0.32);
        scene.add(back);
        this.colliders.push({ x, z, r: 1.0 });
      } else if (kind === 'tree') {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), treeTrunkMat);
        trunk.position.set(x, 1.5, z);
        scene.add(trunk);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(1.9, 8, 8), treeLeafMat);
        crown.position.set(x, 4.2, z);
        scene.add(crown);
        this.colliders.push({ x, z, r: 0.6 });
      } else if (kind === 'busstop') {
        const shelter = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 1.6), new THREE.MeshLambertMaterial({ color: 0x3a6a8a }));
        shelter.position.set(x, 1.3, z);
        scene.add(shelter);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.15, 2), new THREE.MeshLambertMaterial({ color: 0x2a4a5a }));
        roof.position.set(x, 2.7, z);
        scene.add(roof);
        this.colliders.push({ x, z, r: 2.0 });
      }
    };
    for (let bx = 0; bx < CITY.blocks; bx++) {
      for (let bz = 0; bz < CITY.blocks; bz++) {
        const cx = -HALF + CITY.roadWidth + bx * PITCH + CITY.blockSize / 2;
        const cz = -HALF + CITY.roadWidth + bz * PITCH + CITY.blockSize / 2;
        if (bx === 4 && bz === 4) continue; // plaza
        if (bx === 1 && bz === 6) continue; // garage block
        const corner = rng.pick([
          [cx - 34, cz - 34], [cx + 34, cz - 34], [cx - 34, cz + 34], [cx + 34, cz + 34],
        ]);
        propAt(corner[0], corner[1], rng.pick(['hydrant', 'stop', 'bench', 'tree', 'tree']));
        if (rng.chance(0.3)) propAt(cx + rng.range(-30, 30), cz - 34, 'busstop');
      }
    }

    // --- Road graph for traffic: loops around each block -------------------
    for (const c of lines) {
      for (let d = -HALF + 8; d <= HALF - 8; d += 16) {
        this.roadGraph.push({ x: c - 3.5, z: d, dir: 1 });
        this.roadGraph.push({ x: c + 3.5, z: d, dir: -1 });
      }
    }

    // --- Collectibles: golden shells scattered around the city ------------
    const shellGeo = new THREE.OctahedronGeometry(0.8);
    const shellMat = new THREE.MeshBasicMaterial({ color: 0xffc94d });
    for (let i = 0; i < 12; i++) {
      const x = rng.range(-HALF + 30, CITY.seaAt - 50);
      const z = rng.range(-HALF + 30, HALF - 30);
      const m = new THREE.Mesh(shellGeo, shellMat);
      m.position.set(x, 1.2, z);
      scene.add(m);
      this.collectibles.push({ mesh: m, x, z, taken: false });
    }

    // World bounds: keep actors inside the playfield.
    this.bounds = { minX: -HALF - 4, maxX: CITY.seaAt + 8, minZ: -HALF - 4, maxZ: HALF + 4 };
  }

  // Circle vs box/circle colliders. Returns the pushed-out position.
  resolveCollision(x, z, r) {
    for (const c of this.colliders) {
      if (c.r !== undefined) {
        const dx = x - c.x, dz = z - c.z;
        const d2 = dx * dx + dz * dz;
        const min = r + c.r;
        if (d2 < min * min && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          x = c.x + (dx / d) * min;
          z = c.z + (dz / d) * min;
        }
      } else {
        const nx = Math.max(c.minX, Math.min(x, c.maxX));
        const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
        const dx = x - nx, dz = z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          if (d2 > 0.0001) {
            const d = Math.sqrt(d2);
            x = nx + (dx / d) * r;
            z = nz + (dz / d) * r;
          } else {
            // Inside the box: push out along the smallest penetration axis.
            const pl = x - c.minX, pr = c.maxX - x, pt = z - c.minZ, pb = c.maxZ - z;
            const m = Math.min(pl, pr, pt, pb);
            if (m === pl) x = c.minX - r;
            else if (m === pr) x = c.maxX + r;
            else if (m === pt) z = c.minZ - r;
            else z = c.maxZ + r;
          }
        }
      }
    }
    x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x));
    z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, z));
    return { x, z };
  }

  isOnRoad(x, z) {
    const lines = roadLines();
    for (const c of lines) {
      if (Math.abs(x - c) < CITY.roadWidth / 2 + 2) return true;
      if (Math.abs(z - c) < CITY.roadWidth / 2 + 2) return true;
    }
    return false;
  }
}
