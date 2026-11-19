// HUD: the DOM overlay — wanted stars, cash, health, objective line,
// combo CHAIN popups, and every menu (title, mission board, garage,
// pause, victory, busted, dialogue). Kept readable at a glance: one
// objective line, big stars, no dense panels.

import { FONT } from './config.js';

export class HUD {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
    <div id="hud-top">
      <div id="hud-left">
        <div id="wanted"></div>
        <div id="cash">$120</div>
        <div id="health"><div id="health-fill"></div><span id="health-text">100</span></div>
        <div id="rank">RANK 1 · ROOKIE</div>
      </div>
      <div id="hud-center">
        <div id="objective"></div>
        <div id="sub-objective"></div>
      </div>
      <div id="hud-right">
        <canvas id="minimap" width="168" height="168"></canvas>
        <div id="clock">18:42 · GOLDEN HOUR</div>
      </div>
    </div>
    <div id="chain"></div>
    <div id="popups"></div>
    <div id="hint">WASD move · E enter car · F punch · SPACE shoot · H horn · M map</div>
    <div id="toast"></div>
    <div id="menu"></div>
    <div id="dialogue"></div>`;
    this.el = {};
    for (const id of ['wanted', 'cash', 'health-fill', 'health-text', 'rank', 'objective', 'sub-objective', 'clock', 'chain', 'popups', 'hint', 'toast', 'menu', 'dialogue']) {
      this.el[id] = root.querySelector('#' + id);
    }
    this.minimapCanvas = root.querySelector('#minimap');
    this.toastTimer = null;
  }

  update(state) {
    // Wanted stars: filled gold, empty outline.
    const stars = Math.ceil(state.wanted || 0);
    let s = '';
    for (let i = 0; i < 5; i++) s += `<span class="star${i < stars ? ' on' : ''}">★</span>`;
    this.el.wanted.innerHTML = s;
    this.el.cash.textContent = '$' + Math.floor(state.cash || 0).toLocaleString('en-US');
    const hp = Math.max(0, Math.round(state.health || 0));
    this.el['health-fill'].style.width = hp + '%';
    this.el['health-fill'].style.background = hp > 50 ? '#7ed957' : hp > 25 ? '#ffc94d' : '#ff5a4d';
    this.el['health-text'].textContent = hp;
    this.el.rank.textContent = `RANK ${state.rank} · ${state.rankName}`;
    this.el.objective.textContent = state.objective || '';
    this.el['sub-objective'].textContent = state.subObjective || '';
    // Combo chain.
    if (state.chain > 1) {
      this.el.chain.innerHTML = `<span>${state.chain} CHAIN</span>`;
      this.el.chain.style.display = 'block';
    } else {
      this.el.chain.style.display = 'none';
    }
    // Floating score popups.
    this.el.popups.innerHTML = state.popups.map((p) =>
      `<div style="opacity:${Math.min(1, p.life)};color:${p.color}">${p.text}</div>`).join('');
  }

  toast(text, ms) {
    this.el.toast.textContent = text;
    this.el.toast.style.display = 'block';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.el.toast.style.display = 'none'; }, ms || 2600);
  }

  showMenu(html) {
    this.el.menu.innerHTML = html;
    this.el.menu.style.display = 'block';
  }

  hideMenu() {
    this.el.menu.style.display = 'none';
    this.el.menu.innerHTML = '';
  }

  showDialogue(lines, speaker, onDone) {
    let i = 0;
    const render = () => {
      this.el.dialogue.innerHTML = `<div class="dlg-box"><div class="dlg-speaker">${speaker}</div><div class="dlg-line">${lines[i]}</div><div class="dlg-next">E / click — lanjutkan ▸</div></div>`;
      this.el.dialogue.style.display = 'block';
    };
    render();
    const next = () => {
      i++;
      if (i >= lines.length) {
        this.el.dialogue.style.display = 'none';
        this.el.dialogue.innerHTML = '';
        window.removeEventListener('keydown', keyHandler);
        onDone && onDone();
      } else render();
    };
    const keyHandler = (e) => { if (e.code === 'KeyE' || e.code === 'Enter') next(); };
    window.addEventListener('keydown', keyHandler);
    this.el.dialogue.onclick = next;
    this._dlgNext = next;
  }

  advanceDialogue() { if (this._dlgNext) this._dlgNext(); }
}

export const RANK_NAMES = ['ROOKIE', 'HUSTLER', 'STREET BOSS', 'KINGPIN', 'LEGEND OF THE BAY'];

export function rankNameFor(missionsDone) {
  if (missionsDone >= 8) return RANK_NAMES[4];
  if (missionsDone >= 6) return RANK_NAMES[3];
  if (missionsDone >= 4) return RANK_NAMES[2];
  if (missionsDone >= 2) return RANK_NAMES[1];
  return RANK_NAMES[0];
}

// Shared CSS for the HUD + menus, injected by index.html's <style>.
export const HUD_CSS = `
#hud { position: fixed; inset: 0; pointer-events: none; font-family: ${FONT}; color: #f5efe2; z-index: 5; }
#hud-top { position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; padding: 12px 16px; }
#hud-left { display: flex; flex-direction: column; gap: 6px; text-shadow: 0 2px 4px rgba(0,0,0,.7); }
#wanted .star { font-size: 30px; color: rgba(255,255,255,.25); margin-right: 2px; }
#wanted .star.on { color: #ffc94d; text-shadow: 0 0 10px rgba(255,201,77,.9); }
#cash { font-size: 30px; font-weight: 800; color: #7ed957; }
#health { width: 180px; height: 18px; background: rgba(0,0,0,.55); border: 2px solid rgba(255,255,255,.7); border-radius: 9px; overflow: hidden; position: relative; }
#health-fill { height: 100%; width: 100%; }
#health-text { position: absolute; inset: 0; text-align: center; font-size: 12px; font-weight: 700; line-height: 16px; }
#rank { font-size: 13px; font-weight: 700; letter-spacing: 1px; }
#hud-center { text-align: center; max-width: 44%; }
#objective { font-size: 19px; font-weight: 800; text-shadow: 0 2px 6px rgba(0,0,0,.8); background: rgba(0,0,0,.45); padding: 6px 14px; border-radius: 8px; display: inline-block; }
#objective:empty { display: none; }
#sub-objective { font-size: 13px; margin-top: 5px; text-shadow: 0 2px 4px rgba(0,0,0,.8); }
#hud-right { text-align: right; }
#minimap { border-radius: 50%; box-shadow: 0 0 0 3px rgba(255,255,255,.8), 0 4px 18px rgba(0,0,0,.5); background: #3a5a3a; }
#clock { font-size: 12px; font-weight: 700; margin-top: 6px; text-shadow: 0 2px 4px rgba(0,0,0,.8); }
#chain { position: absolute; top: 22%; left: 50%; transform: translateX(-50%); font-size: 34px; font-weight: 900; color: #ffc94d; text-shadow: 0 0 14px rgba(255,160,40,.9), 0 2px 4px #000; display: none; }
#popups { position: absolute; top: 30%; left: 50%; transform: translateX(-50%); text-align: center; font-size: 22px; font-weight: 800; text-shadow: 0 2px 4px #000; }
#hint { position: absolute; bottom: 12px; left: 16px; font-size: 12px; opacity: .85; text-shadow: 0 2px 4px #000; }
#toast { position: absolute; bottom: 64px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,.7); padding: 10px 18px; border-radius: 8px; font-size: 16px; font-weight: 700; display: none; }
#menu { position: absolute; inset: 0; display: none; pointer-events: auto; background: rgba(10,12,20,.72); }
.menu-card { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: min(680px, 92vw); max-height: 88vh; overflow: auto; background: linear-gradient(160deg, #2a2118, #1a2436); border: 2px solid #ffc94d; border-radius: 16px; padding: 28px 32px; box-shadow: 0 20px 60px rgba(0,0,0,.6); }
.menu-card h1 { margin: 0 0 4px; font-size: 44px; letter-spacing: 2px; color: #ffc94d; }
.menu-card h2 { margin: 0 0 10px; font-size: 26px; color: #ffc94d; }
.menu-card p { margin: 8px 0; line-height: 1.5; color: #f5efe2; }
.menu-card .sub { color: #c9bda6; font-size: 14px; }
.menu-btn { display: inline-block; margin: 12px 8px 0 0; padding: 12px 22px; font-size: 16px; font-weight: 800; font-family: ${FONT}; color: #1a1206; background: #ffc94d; border: none; border-radius: 10px; cursor: pointer; }
.menu-btn.ghost { background: transparent; color: #f5efe2; border: 2px solid #f5efe2; }
.mission-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; margin: 6px 0; background: rgba(255,255,255,.07); border-radius: 8px; }
.mission-row.done { opacity: .55; }
.mission-row .pay { color: #7ed957; font-weight: 800; white-space: nowrap; }
#dialogue { position: absolute; left: 0; right: 0; bottom: 0; display: none; pointer-events: auto; }
.dlg-box { margin: 0 auto 24px; width: min(720px, 92vw); background: rgba(8,10,18,.88); border: 2px solid #ffc94d; border-radius: 12px; padding: 16px 20px; }
.dlg-speaker { color: #ffc94d; font-weight: 900; letter-spacing: 1px; margin-bottom: 6px; }
.dlg-line { font-size: 17px; line-height: 1.5; }
.dlg-next { margin-top: 10px; font-size: 12px; color: #c9bda6; text-align: right; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 14px 0; }
.stat-grid div { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,.15); padding: 6px 0; }
.stat-grid b { color: #ffc94d; }
`;
