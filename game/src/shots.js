// Shots: deterministic staging for the 4 screenshots. ?shot=cover|
// street|board|victory&seed=1 puts the game into a composed scene and
// sets window.__shotReady once the frame is drawn, so the screenshot
// script can capture it. These are real game states, not mockups.

// Street frame, composed after the fast-forward: pedestrians on the
// sidewalk ahead of the player (facing -z), traffic up the road, two
// parked cars at the kerb.
export function stageStreetFrame(g) {
  g.peds.peds.slice(0, 6).forEach((p, i) => {
    const px = [14, 2, 16, 0, 20, -4][i], pz = [78, 72, 64, 58, 70, 52][i];
    p.x = px; p.z = pz; p.angle = Math.PI; p.mesh.position.set(px, 0, pz);
  });
  g.traffic.cars.slice(0, 3).forEach((c, i) => {
    const spots = [[8, 56, 0], [4.5, 40, Math.PI], [11.5, 76, 0]];
    c.x = spots[i][0]; c.z = spots[i][1]; c.angle = spots[i][2];
    c.vertical = true; c.dir = i === 1 ? -1 : 1; c.lane = 8; c.speed = 9; c.cruise = 9;
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.angle;
  });
  g.parkedCars.slice(0, 2).forEach((c, i) => {
    const spots = [[13.5, 66], [13.5, 48]];
    c.x = spots[i][0]; c.z = spots[i][1]; c.angle = Math.PI / 2;
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.angle;
  });
}

// After the fast-forward, compose the cover frame: two interceptors
// ahead of the player (in frame, head-on) and the helicopter low over
// the road. Shot mode freezes updates afterwards, so this stays put.
export function stageCoverFrame(g) {
  const cops = g.police.cars.slice(0, 2);
  const spots = [[2, 26, Math.PI], [14, 34, Math.PI]];
  cops.forEach((c, i) => {
    c.x = spots[i][0];
    c.z = g.player.z + spots[i][1];
    c.angle = spots[i][2];
    c.mesh.position.set(c.x, 0, c.z);
    c.mesh.rotation.y = c.angle;
  });
  if (g.police.heli) {
    g.police.heli.position.set(g.player.x + 16, 19, g.player.z + 42);
    g.police.heli.rotation.y = Math.PI;
  }
}

export function shotFromUrl() {
  const q = new URLSearchParams(location.search);
  return q.get('shot') || null;
}

// Called by main.js after the world is built. Returns the staged mode.
export function applyShot(game, shot) {
  if (!shot) return null;
  const g = game;
  if (shot === 'cover') {
    // Densest frame: police chase with helicopter, 4 wanted stars,
    // roadblock ahead, mission objective, minimap, traffic + peds,
    // beach and golden-hour sun — all readable at 768x480.
    g.startMission(0);
    g.police.wanted = 4;
    g.state.cash = 2450;
    g.combat.chain = 6;
    g.combat.chainTimer = 3.5;
    g.playerInCar = true;
    g.playerCar = g.parkedCars[0];
    g.playerCar.driven = true;
    // On the road (x=8 is a road centre line), driving north, police behind.
    g.playerCar.x = 8; g.playerCar.z = 40;
    g.playerCar.angle = 0;
    g.playerCar.speed = 24;
    g.player.x = 8; g.player.z = 40;
    g.player.angle = 0;
    // Pack traffic ahead and pedestrians on the sidewalk into the frame.
    const near = g.traffic.cars.slice(0, 3);
    const spots = [[8, 78, 0], [8, 104, 0], [-0.5, 92, Math.PI]];
    near.forEach((c, i) => {
      c.x = spots[i][0]; c.z = spots[i][1]; c.angle = spots[i][2];
      c.vertical = true; c.dir = i === 2 ? -1 : 1; c.lane = 8; c.speed = 10; c.cruise = 10;
      c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.angle;
    });
    g.peds.peds.slice(0, 4).forEach((p, i) => {
      const px = [16, 0, 18, -2][i], pz = [56, 66, 84, 96][i];
      p.x = px; p.z = pz; p.mesh.position.set(px, 0, pz);
    });
    g.police.ensureCars(g.player.x, g.player.z);
    g.state.objective = 'MISSION 1 · FIRST LIGHT — Drive the car to the plaza marker';
    g.hud.toast('WANTED ★★★★ · Mara: "Lose them, then bring the car home!"', 4000);
    g.cameraSnap = { x: 8, z: 40, angle: 0 };
    return 'cover';
  }
  if (shot === 'street') {
    // On foot in the city: peds, traffic, palms, objective visible.
    g.player.x = 8; g.player.z = 88;
    g.player.angle = Math.PI * 0.9;
    g.state.objective = 'Explore Solara Bay — find the mission board at the plaza';
    g.state.subObjective = 'E steals a car · golden shells pay $75';
    g.cameraSnap = { x: 8, z: 88, angle: Math.PI * 0.9 };
    return 'street';
  }
  if (shot === 'board') {
    // Mission board menu open over the plaza.
    g.player.x = -40; g.player.z = -28;
    g.player.angle = 0;
    g.openMissionBoard();
    g.cameraSnap = { x: -40, z: -28, angle: 0 };
    return 'board';
  }
  if (shot === 'victory') {
    // Victory / stats screen after all 8 missions, marina backdrop.
    g.player.x = 280; g.player.z = 160; g.player.angle = Math.PI * 0.75;
    g.state.cash = 12480;
    g.save.missionsDone = [0, 1, 2, 3, 4, 5, 6, 7];
    g.save.bestChain = 12;
    g.save.totalEarned = 12360;
    g.showVictory();
    g.cameraSnap = { x: 280, z: 160, angle: Math.PI * 0.75 };
    return 'victory';
  }
  return null;
}
