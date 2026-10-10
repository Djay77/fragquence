export const SIZE = 4;
export const WIDTH = 32;
export const HEIGHT = 26;

export type Point = { x: number; z: number };
export type EnemyKind = 'parasite' | 'drone' | 'brouilleur';
type Encounter = [Point, EnemyKind];
type Room = [number, number, number, number];
type Level = {
  number: number;
  name: string;
  briefing: string;
  rooms: Room[];
  spawn: Point;
  relay: Point;
  modules: Point[];
  racks: Point[];
  lights: Point[];
  markings: Point[];
  health: Point[];
  ammo: Point[];
  enemies: Encounter[];
  wave: Encounter[];
};

const levels: [Level, Level] = [
  {
    number: 7,
    name: 'NOEUD 07',
    briefing: 'Le Noeud 07 est coupe du reseau. Traversez les secteurs, recuperez trois modules et relancez le relais avant que les parasites ne prennent le controle.',
    rooms: [
      [2, 3, 9, 9], [11, 7, 20, 17], [22, 2, 29, 9],
      [2, 16, 9, 22], [22, 16, 29, 22], [12, 20, 19, 24],
      [9, 5, 12, 7], [20, 5, 23, 8], [6, 9, 8, 17],
      [9, 15, 12, 18], [19, 15, 23, 18], [15, 17, 17, 21],
    ],
    spawn: { x: 5, z: 6 },
    relay: { x: 15, z: 22 },
    modules: [{ x: 26, z: 5 }, { x: 5, z: 19 }, { x: 26, z: 19 }],
    racks: [{ x: 24, z: 3 }, { x: 28, z: 3 }, { x: 24, z: 8 }, { x: 28, z: 8 }, { x: 4, z: 17 }, { x: 7, z: 21 }, { x: 24, z: 17 }, { x: 28, z: 21 }],
    lights: [{ x: 16, z: 12 }],
    markings: [{ x: 13, z: 9 }, { x: 19, z: 16 }, { x: 7, z: 8 }, { x: 15, z: 21 }],
    health: [{ x: 14, z: 10 }, { x: 4, z: 18 }, { x: 25, z: 18 }],
    ammo: [{ x: 8, z: 7 }, { x: 18, z: 13 }, { x: 27, z: 7 }],
    enemies: [
      [{ x: 14, z: 12 }, 'parasite'], [{ x: 18, z: 11 }, 'drone'],
      [{ x: 25, z: 7 }, 'parasite'], [{ x: 27, z: 5 }, 'drone'],
      [{ x: 6, z: 19 }, 'brouilleur'], [{ x: 4, z: 21 }, 'parasite'],
      [{ x: 25, z: 20 }, 'drone'], [{ x: 27, z: 18 }, 'brouilleur'],
    ],
    wave: [
      [{ x: 13, z: 20 }, 'parasite'], [{ x: 18, z: 20 }, 'parasite'],
      [{ x: 14, z: 16 }, 'drone'], [{ x: 19, z: 16 }, 'brouilleur'],
      [{ x: 11, z: 15 }, 'parasite'],
    ],
  },
  {
    number: 8,
    name: 'NOEUD 08',
    briefing: 'Le centre de transit est sous brouillage. Entrez par les quais, contournez le coeur du reseau, recuperez les trois modules et reprenez le relais nord-est.',
    rooms: [
      [2, 17, 9, 23], [2, 2, 9, 9], [11, 9, 20, 17],
      [22, 16, 29, 23], [22, 2, 29, 9], [12, 2, 19, 6],
      [5, 9, 7, 18], [9, 11, 12, 14], [9, 4, 13, 6],
      [15, 6, 17, 10], [20, 11, 25, 13], [24, 9, 26, 17],
      [19, 4, 23, 6], [18, 17, 25, 19],
    ],
    spawn: { x: 4, z: 20 },
    relay: { x: 26, z: 5 },
    modules: [{ x: 5, z: 5 }, { x: 15, z: 4 }, { x: 26, z: 20 }],
    racks: [{ x: 3, z: 3 }, { x: 8, z: 3 }, { x: 3, z: 8 }, { x: 8, z: 8 }, { x: 13, z: 11 }, { x: 18, z: 15 }, { x: 23, z: 18 }, { x: 28, z: 18 }, { x: 23, z: 22 }, { x: 28, z: 22 }],
    lights: [{ x: 6, z: 14 }, { x: 15, z: 12 }, { x: 25, z: 12 }, { x: 15, z: 5 }],
    markings: [{ x: 6, z: 18 }, { x: 11, z: 12 }, { x: 17, z: 10 }, { x: 24, z: 13 }, { x: 26, z: 7 }],
    health: [{ x: 6, z: 16 }, { x: 18, z: 14 }, { x: 27, z: 22 }, { x: 23, z: 7 }],
    ammo: [{ x: 8, z: 20 }, { x: 12, z: 5 }, { x: 19, z: 12 }, { x: 25, z: 18 }],
    enemies: [
      [{ x: 7, z: 18 }, 'parasite'], [{ x: 6, z: 12 }, 'drone'],
      [{ x: 5, z: 7 }, 'brouilleur'], [{ x: 15, z: 5 }, 'drone'],
      [{ x: 13, z: 13 }, 'parasite'], [{ x: 18, z: 11 }, 'brouilleur'],
      [{ x: 26, z: 18 }, 'parasite'], [{ x: 27, z: 21 }, 'drone'],
      [{ x: 25, z: 12 }, 'drone'], [{ x: 24, z: 8 }, 'brouilleur'],
    ],
    wave: [
      [{ x: 23, z: 4 }, 'parasite'], [{ x: 28, z: 7 }, 'parasite'],
      [{ x: 25, z: 9 }, 'drone'], [{ x: 22, z: 6 }, 'brouilleur'],
      [{ x: 18, z: 5 }, 'drone'], [{ x: 26, z: 12 }, 'parasite'],
    ],
  },
];

export const level = new URLSearchParams(window.location.search).get('level') === '2' ? levels[1] : levels[0];
export const tiles = Array.from({ length: HEIGHT }, () => Array<boolean>(WIDTH).fill(false));
for (const [x1, z1, x2, z2] of level.rooms) {
  for (let z = z1; z <= z2; z++) {
    for (let x = x1; x <= x2; x++) tiles[z][x] = true;
  }
}

export function world(point: Point): Point {
  return { x: (point.x - WIDTH / 2 + 0.5) * SIZE, z: (point.z - HEIGHT / 2 + 0.5) * SIZE };
}

export function cell(x: number, z: number): Point {
  return { x: Math.floor(x / SIZE + WIDTH / 2), z: Math.floor(z / SIZE + HEIGHT / 2) };
}

export function walkable(x: number, z: number, radius = 0): boolean {
  for (const dx of [-radius, radius]) {
    for (const dz of [-radius, radius]) {
      const p = cell(x + dx, z + dz);
      if (!tiles[p.z]?.[p.x]) return false;
    }
  }
  return true;
}
