// Minimap: a round 2D canvas in the HUD corner. Roads, beach, the
// player arrow, cars, police, peds and the mission waypoint — everything
// the player needs to navigate Solara Bay at a glance.

import { CITY } from './config.js';

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = canvas.width;
  }

  draw(state) {
    const { ctx, size } = this;
    const s = size / (CITY.size + 80);
    const toMap = (x, z) => [size / 2 + (x - 40) * s, size / 2 + z * s];
    ctx.clearRect(0, 0, size, size);
    // Round mask.
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    // Background: grass, then sea.
    ctx.fillStyle = '#5d8a4a';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#1f6f8b';
    const [seaX] = toMap(CITY.seaAt, 0);
    ctx.fillRect(seaX, 0, size - seaX, size);
    ctx.fillStyle = '#e8c98a';
    ctx.fillRect(seaX - CITY.beachWidth * s, 0, CITY.beachWidth * s, size);
    // Roads.
    ctx.strokeStyle = '#3a3f4a';
    ctx.lineWidth = Math.max(2, CITY.roadWidth * s);
    for (let i = 0; i <= 8; i++) {
      const c = -320 + 8 + i * 80;
      const [x0] = toMap(c, 0);
      const [, z0] = toMap(0, c);
      ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, z0); ctx.lineTo(size, z0); ctx.stroke();
    }
    // Garage + plaza.
    const [gx, gz] = toMap(-200, 200);
    ctx.fillStyle = '#ff5a4d';
    ctx.fillRect(gx - 4, gz - 4, 8, 8);
    const [px, pz] = toMap(-40, -40);
    ctx.fillStyle = '#ffc94d';
    ctx.beginPath(); ctx.arc(px, pz, 5, 0, Math.PI * 2); ctx.fill();
    // Mission waypoint: pulsing gold diamond.
    if (state.waypoint) {
      const [wx, wz] = toMap(state.waypoint.x, state.waypoint.z);
      const pulse = 5 + Math.sin(performance.now() / 200) * 2;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(wx, wz - pulse); ctx.lineTo(wx + pulse, wz);
      ctx.lineTo(wx, wz + pulse); ctx.lineTo(wx - pulse, wz);
      ctx.closePath(); ctx.fill();
    }
    // Police cars: blue dots.
    ctx.fillStyle = '#3a7bff';
    for (const c of state.police || []) {
      const [x, z] = toMap(c.x, c.z);
      ctx.beginPath(); ctx.arc(x, z, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Traffic: grey dots.
    ctx.fillStyle = '#d8d8d8';
    for (const c of state.traffic || []) {
      const [x, z] = toMap(c.x, c.z);
      ctx.fillRect(x - 1.5, z - 1.5, 3, 3);
    }
    // Player: white arrow.
    const [ux, uz] = toMap(state.player.x, state.player.z);
    ctx.save();
    ctx.translate(ux, uz);
    ctx.rotate(-state.player.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    // Ring + north tick.
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', size / 2, 13);
  }
}
