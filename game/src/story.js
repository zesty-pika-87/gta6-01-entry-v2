// Story: Solara Bay is ours. Mara Voss, Old Sal, The Broker, Detective
// Rook — every name, every line is original, written for this game.
// No Rockstar names, no Vice City, no copied characters.

export const CHARACTERS = {
  mara: { name: 'Mara Voss', role: 'Wheelwoman', color: '#ff8a5c' },
  sal: { name: 'Old Sal', role: 'Harbour fixer', color: '#9dff7a' },
  broker: { name: 'The Broker', role: 'Middleman', color: '#c9a0ff' },
  rook: { name: 'Detective Rook', role: 'Solara PD', color: '#5cbaff' },
  dario: { name: 'Dario Flint', role: 'Rival crew boss', color: '#ff5a4d' },
  lena: { name: 'Lena Kade', role: 'Garage owner', color: '#ffe066' },
};

export const INTRO = [
  'Solara Bay. Sun, salt, and everybody owes somebody.',
  'You arrived with $120 and a name nobody knows yet.',
  'Mara Voss is waiting at the plaza. She has work — and work pays.',
];

export const MISSION_STORIES = [
  {
    id: 0, name: 'First Light', giver: 'mara',
    brief: 'Mara needs a car. Any car. Take one from the street and bring it to the plaza — fast, before the owner notices.',
    intro: ['Mara: "Welcome to Solara Bay, stranger."', 'Mara: "First rule: nobody walks when wheels are free. Grab a car, bring it here."'],
    done: 'Mara: "Not bad. You drive like you mean it. There is more work where that came from."',
  },
  {
    id: 1, name: "The Broker's Errand", giver: 'broker',
    brief: 'The Broker left a package at the harbour. Pick it up and deliver it to the garage — the police are sniffing around, so keep it clean.',
    intro: ['Broker: "A package. Harbour east. No questions, no peeking."', 'Broker: "Deliver it to Lena\'s garage. And try not to collect stars on the way."'],
    done: 'Broker: "Clean. I like clean. The Bay is starting to notice you."',
  },
  {
    id: 2, name: "Old Sal's Debt", giver: 'sal',
    brief: 'Old Sal is owed money by Dario Flint\'s crew. Go to the docks, deal with the collectors, and bring back what they owe.',
    intro: ['Sal: "Dario\'s boys took my catch money. Three of them, by the docks."', 'Sal: "I am too old to fight. You are not. Bring my money back."'],
    done: 'Sal: "Ha! You fight like the tide. The harbour remembers this."',
  },
  {
    id: 3, name: 'Hot Wheels', giver: 'lena',
    brief: 'Lena needs a fast car for a client — a red Comet, last seen racing along the beach road. Steal it and bring it to the garage.',
    intro: ['Lena: "A red Comet, beach road, driver thinks he is fast."', 'Lena: "Prove him wrong. My garage, my price, your cut."'],
    done: 'Lena: "She purrs. You have good taste in other people\'s cars."',
  },
  {
    id: 4, name: 'Harbour Lights', giver: 'mara',
    brief: 'A rival shipment is landing at the harbour tonight. Mara wants the crates — grab three of them before Dario\'s crew does.',
    intro: ['Mara: "Dario is moving crates tonight. Three of them are ours now."', 'Mara: "Harbour, east end. Quick hands, quicker feet."'],
    done: 'Mara: "Three crates, zero witnesses. You are officially my favourite."',
  },
  {
    id: 5, name: 'The Long Way Home', giver: 'broker',
    brief: 'The Broker needs a quiet taxi run: pick up a nervous client at the plaza and drive them to the north gate without a single star.',
    intro: ['Broker: "A client. Nervous. Allergic to sirens."', 'Broker: "Plaza to north gate. No stars, no scratches, no questions."'],
    done: 'Broker: "The client sends thanks. And a tip. Keep the change."',
  },
  {
    id: 6, name: 'Storm Warning', giver: 'rook',
    brief: 'Detective Rook has a deal: clear Dario\'s roadblock on the beach road and he will wipe one star off your record. Bring a car — it will get loud.',
    intro: ['Rook: "Off the record, kid. Dario\'s roadblock is embarrassing us."', 'Rook: "Clear it. Loud is fine. I will look the other way — once."'],
    done: 'Rook: "Roadblock gone. Consider one star forgiven. Do not make me regret this."',
  },
  {
    id: 7, name: 'Solara Rising', giver: 'mara',
    brief: 'The finale: Dario Flint himself is at the marina with his whole crew. Take the Bay back — defeat his crew and claim the marina.',
    intro: ['Mara: "This is it. Dario at the marina, his whole crew."', 'Mara: "Take the Bay back, and Solara is yours."'],
    done: 'Mara: "SOLARA BAY IS YOURS. The sun never looked this good."',
  },
];

export const OUTRO = [
  'SOLARA BAY IS YOURS',
  'Eight jobs. One city. Zero apologies.',
  'The Bay remembers your name now.',
];

export const TIPS = [
  'E — enter / steal a car',
  'W A S D — move / drive',
  'F — punch · SPACE — shoot',
  'H — horn · M — big map',
  'Golden shells pay $75 each',
  'Stay out of sight to lose stars',
];
