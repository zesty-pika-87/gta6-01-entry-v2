// Missions: 8 named story jobs, each a small state machine with
// waypoints, objectives and a payout. The mission board at the plaza
// starts the next job; finishing all 8 wins the game.

import { ECONOMY } from './config.js';
import { MISSION_STORIES as STORIES } from './story.js';

export const MISSION_STATE = { IDLE: 'idle', ACTIVE: 'active', DONE: 'done' };

function wp(x, z, label) { return { x, z, label }; }

export class Missions {
  constructor(world, rng) {
    this.world = world;
    this.rng = rng;
    this.current = -1;
    this.state = MISSION_STATE.IDLE;
    this.step = 0;
    this.objective = '';
    this.waypoints = [];
    this.defs = this.buildDefs();
  }

  buildDefs() {
    const plaza = { x: -40, z: -40 };
    const garage = { x: -200, z: 200 };
    const harbour = { x: 300, z: -120 };
    const docks = { x: 280, z: 120 };
    const marina = { x: 300, z: 200 };
    const northGate = { x: -40, z: -296 };
    const beachRoad = { x: 280, z: -40 };
    return [
      { // 0 First Light — steal any car, bring it to the plaza
        type: 'steal', target: plaza, payout: 350,
        steps: ['Steal any car (E near a car)', 'Drive it to the plaza marker'],
      },
      { // 1 Broker's Errand — pickup at harbour, deliver to garage
        type: 'deliver', pickup: harbour, target: garage, payout: 500,
        steps: ['Pick up the package at the harbour', 'Deliver it to Lena\'s garage'],
      },
      { // 2 Old Sal's Debt — defeat 3 collectors at the docks
        type: 'fight', at: docks, enemies: 3, payout: 650,
        steps: ['Deal with Dario\'s collectors at the docks (3)'],
      },
      { // 3 Hot Wheels — steal the red Comet on the beach road
        type: 'stealCar', at: beachRoad, color: 0xd84a3a, target: garage, payout: 700,
        steps: ['Steal the red Comet on the beach road', 'Bring it to the garage'],
      },
      { // 4 Harbour Lights — collect 3 crates at the harbour
        type: 'collect', at: harbour, count: 3, payout: 800,
        steps: ['Grab 3 crates at the harbour'],
      },
      { // 5 Long Way Home — taxi: plaza to north gate, no stars
        type: 'taxi', pickup: plaza, target: northGate, payout: 600,
        steps: ['Pick up the client at the plaza', 'Drive to the north gate — no stars!'],
      },
      { // 6 Storm Warning — smash through the roadblock on beach road
        type: 'roadblock', at: beachRoad, payout: 900,
        steps: ['Clear Dario\'s roadblock on the beach road'],
      },
      { // 7 Solara Rising — defeat 5 crew at the marina
        type: 'fight', at: marina, enemies: 5, payout: 1500,
        steps: ['Defeat Dario\'s crew at the marina (5)'],
      },
    ];
  }

  get story() { return STORIES[this.current] || null; }
  get def() { return this.defs[this.current] || null; }

  start(index) {
    this.current = index;
    this.state = MISSION_STATE.ACTIVE;
    this.step = 0;
    const d = this.def;
    this.objective = d.steps[0];
    this.waypoints = [];
    if (d.pickup) this.waypoints.push(wp(d.pickup.x, d.pickup.z, 'PICKUP'));
    if (d.at) this.waypoints.push(wp(d.at.x, d.at.z, 'GO'));
    if (d.target) this.waypoints.push(wp(d.target.x, d.target.z, 'DROP'));
    return this.story;
  }

  advance() {
    const d = this.def;
    this.step++;
    if (this.step < d.steps.length) {
      this.objective = d.steps[this.step];
      return false;
    }
    return true; // all steps done
  }

  complete() {
    const d = this.def;
    this.state = MISSION_STATE.DONE;
    this.objective = '';
    this.waypoints = [];
    return d.payout + ECONOMY.missionPerStar * 0;
  }

  nextIndex(doneList) {
    for (let i = 0; i < this.defs.length; i++) {
      if (!doneList.includes(i)) return i;
    }
    return -1;
  }

  get currentWaypoint() {
    return this.waypoints[this.step] || this.waypoints[this.waypoints.length - 1] || null;
  }
}
