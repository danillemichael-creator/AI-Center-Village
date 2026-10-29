/** Beginner lesson copy. Documentation sources: docs/learning-sources.md. */
export const MODULES = [
  {
    id: 'sensors',
    name: 'Sensors',
    part: 'Distance sensor',
    tagline: 'Find the loot in the dark',
    description: 'The lights are out! Ping your scanner, dodge sneaky scrapbots, and grab four lost parts. Get back to the dock with your loot.',
    challenge: 'Lights-out loot run',
    skill: 'Sensing the world',
    learned: 'A distance sensor provides measurements that a controller can use to choose what the robot does next.',
    notebook: [
      'Sensors turn something in the world into a signal a controller can read.',
      'An ultrasonic distance sensor measures using sound pulses and their echoes.',
      'A measurement is an input. The robot still needs a program to decide what to do.'
    ],
    xp: 100,
    color: 'teal'
  },
  {
    id: 'motors',
    name: 'Motors',
    part: 'Drive motors',
    tagline: 'Little wheels, big getaway',
    description: 'Weave past scrapbots, chain your pickups, and fire a turbo dash to scoop up four parts. Then race your haul back to the dock.',
    challenge: 'Turbo parts run',
    skill: 'Motion & steering',
    learned: 'Changing the two wheel speeds lets a two-wheel robot move straight, turn, or stop.',
    notebook: [
      'An electric motor changes electrical energy into movement.',
      'On a two-wheel robot, the wheel-speed difference changes its direction.',
      'The game uses an ideal motion model. Real wheels can slip or turn at slightly different speeds.'
    ],
    xp: 100,
    color: 'orange'
  },
  {
    id: 'controllers',
    name: 'Controllers',
    part: 'Microcontroller',
    tagline: 'Right route, robot loot',
    description: 'Tag four numbered checkpoints in order, outsmart the scrapbots, and bring your haul back to the dock. A clever route makes all the difference.',
    challenge: 'Checkpoint rush',
    skill: 'Sequences & logic',
    learned: 'A controller runs a program: it can read inputs, follow instructions, and send output signals.',
    notebook: [
      'A microcontroller runs the robot’s program and handles input and output signals.',
      'Instruction order matters: turn, then move is different from move, then turn.',
      'A motor driver uses the controller’s signals to control motor power.'
    ],
    xp: 100,
    color: 'blue'
  },
  {
    id: 'power',
    name: 'Power',
    part: 'Battery pack',
    tagline: 'Big energy, tiny robot',
    description: 'Carry energy cells to three charging stations. Dodge the scrapbots, pop your shield, and power up the workshop. Then head home to the dock!',
    challenge: 'Battery blitz',
    skill: 'Circuits & energy',
    learned: 'A battery supplies energy, and the motor’s circuit needs a complete path back to the battery.',
    notebook: [
      'A battery supplies electrical energy to the robot’s circuit.',
      'A complete motor circuit includes a path from the battery, through the motor, and back.',
      'An open switch breaks the path. A closed switch completes it.'
    ],
    xp: 100,
    color: 'gold'
  }
];

export function getModule(id) {
  return MODULES.find(module => module.id === id);
}
