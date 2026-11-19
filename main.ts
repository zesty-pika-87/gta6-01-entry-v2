// Solara Bay — the gta6-01 entrypoint (Node 22, standard library only).
// The game is this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html and its ES modules, three.js
// vendored under game/vendor/, no network request at run time). This
// program hands it in: it copies game/ and screenshots/ from beside this
// file to /output and writes /output/dossier.json, the summary the judge
// reads, with the vendored make.fun library (vendor/makefun-game.ts).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Run it twice and the two outputs are byte-identical: the build copies
// files only, and buildDossier is deterministic over the same tree.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB
// of game files, in all, or a path under game/ over 1000 bytes).
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function countTree(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      const sub = countTree(p);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += st.size;
      if (Buffer.byteLength(p, 'utf8') > CAPS.game_path_max_bytes) {
        throw new Error(`path too long for the gate: ${p}`);
      }
    }
  }
  return { files, bytes };
}

function main() {
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }

  // Fail loudly here, before the dossier is written, if the entry would
  // trip the gate on size: a refused entry is worse than a loud build.
  const gameStats = countTree(join(out, 'game'));
  if (gameStats.files > CAPS.game_max_files) {
    throw new Error(`game/ has ${gameStats.files} files, over the ${CAPS.game_max_files} cap`);
  }
  if (gameStats.bytes > CAPS.game_max_bytes) {
    throw new Error(`game/ is ${gameStats.bytes} bytes, over the ${CAPS.game_max_bytes} cap`);
  }
  const shots = existsSync(join(out, 'screenshots')) ? readdirSync(join(out, 'screenshots')) : [];
  if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
    throw new Error(`expected 3-4 screenshots, found ${shots.length}`);
  }
  for (const name of shots) {
    const size = statSync(join(out, 'screenshots', name)).size;
    if (size > CAPS.screenshots.max_bytes) {
      throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
    }
  }

  writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));
  // Prove the dossier is well-formed before reporting success: a
  // corrupt dossier would fail the gate after the entry is handed in.
  const dossierText = readFileSync(join(out, 'dossier.json'), 'utf8');
  JSON.parse(dossierText);
  console.log(`Solara Bay handed in: ${gameStats.files} game files, ${shots.length} screenshots, dossier ${Buffer.byteLength(dossierText, 'utf8')} bytes -> ${out}`);
}

main();
