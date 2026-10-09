export const SIZE = 4;
export const WIDTH = 32;
export const HEIGHT = 26;

export type Point = { x: number; z: number };
export const tiles = Array.from({ length: HEIGHT }, () => Array<boolean>(WIDTH).fill(false));

function carve(x1: number, z1: number, x2: number, z2: number) {
  for (let z = z1; z <= z2; z++) {
    for (let x = x1; x <= x2; x++) tiles[z][x] = true;
  }
}

// Six readable spaces connected by generous corridors; all objectives are reachable.
carve(2, 3, 9, 9);   // workshop / spawn
carve(11, 7, 20, 17); // hub
carve(22, 2, 29, 9);  // servers
carve(2, 16, 9, 22);  // bridge
carve(22, 16, 29, 22); // storage
carve(12, 20, 19, 24); // relay
carve(9, 5, 12, 7);
carve(20, 5, 23, 8);
carve(6, 9, 8, 17);
carve(9, 15, 12, 18);
carve(19, 15, 23, 18);
carve(15, 17, 17, 21);

export const spawn: Point = { x: 5, z: 6 };
export const relay: Point = { x: 15, z: 22 };
export const modules: Point[] = [{ x: 26, z: 5 }, { x: 5, z: 19 }, { x: 26, z: 19 }];

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
