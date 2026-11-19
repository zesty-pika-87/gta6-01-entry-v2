# gta6-01-entry-v2

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/zesty-pika-87/gta6-01-entry-v2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/zesty-pika-87/gta6-01-entry-v2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solara Bay — an open-world crime story in the spirit of GTA 6, built for make.fun's gta6-01 bounty. A sun-soaked procedural city (8×8 blocks, beach and golden-hour sea), on foot and by stolen car, with traffic and pedestrians, a 1–5 star wanted system with police chases, roadblocks and a helicopter, 8 named story missions with original characters, combat with a CHAIN combo, a garage with car purchases and upgrades, a save, a round minimap, procedural WebAudio sound and generative music. Runs entirely offline in a desktop browser; three.js is vendored under game/vendor/.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

---

Entered on [make.fun](https://make.fun/?ref=1aaz13gb&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards

## How to play

- **WASD** — move / drive · **Shift** — run · **E** — enter / steal a car, talk at the mission board and garage
- **F** — punch · **Space** — shoot · **H** — horn · **P** — pause · **M** — big map (minimap is always on screen)
- Start at the mission board in the plaza: 8 story missions from Mara Voss, Old Sal, The Broker, Lena Kade and Detective Rook. Finish all 8 to own Solara Bay.
- Golden shells scattered around the city pay $75 each. Wanted stars fall when you stay out of sight.
- Screenshots are deterministic: `?shot=cover|street|board|victory&seed=1` stages each scene (`shots.json`).
