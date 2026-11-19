// Feel: screen shake, hit-stop and floating score popups. Small systems,
// big difference in how the game reads on a screenshot and in the hand.

export class Feel {
  constructor() {
    this.shakeTime = 0;
    this.shakeMag = 0;
    this.hitStop = 0;
    this.popups = []; // {text, x, y, life, color} in screen space, drawn by HUD
  }

  shake(mag, time) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  freeze(seconds) { this.hitStop = Math.max(this.hitStop, seconds); }

  popup(text, color) {
    this.popups.push({ text, color: color || '#ffc94d', life: 1.2 });
    if (this.popups.length > 6) this.popups.shift();
  }

  // Returns the shake offset for this frame (0 when calm).
  update(dt) {
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return { x: 0, y: 0, frozen: true };
    }
    let x = 0, y = 0;
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const m = this.shakeMag * (this.shakeTime / 0.3);
      x = (Math.random() * 2 - 1) * m;
      y = (Math.random() * 2 - 1) * m;
      if (this.shakeTime <= 0) this.shakeMag = 0;
    }
    for (const p of this.popups) p.life -= dt;
    this.popups = this.popups.filter((p) => p.life > 0);
    return { x, y, frozen: false };
  }
}
