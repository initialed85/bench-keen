// Level maps. Built with a small grid helper so tile coordinates stay exact.
// Legend:
//   # ground   X solid block   = platform   C cloud   ^ spike   E exit gate
//   P player spawn   * memory ball   G gem   L life token   K command
//   d dacter   g gopter   h shtrike   b bat   l slug   t tentacat
//
// Jump apex is ~44px (2.2 tiles), so every climb is a staircase of 2-tile steps.

function grid(w, h) {
  return Array.from({ length: h }, () => Array(w).fill('.'));
}
function fill(g, x0, x1, y, c) {
  for (let x = x0; x <= x1; x++) g[y][x] = c;
}
function put(g, x, y, c) {
  g[y][x] = c;
}
function rowsOf(g) {
  return g.map((r) => r.join(''));
}

// ------------------------------------------------------------- LEVEL 1
function level1() {
  const w = 140, h = 12;
  const g = grid(w, h);
  const ground = [[0, 14], [19, 30], [35, 50], [55, 70], [75, 90], [95, 110], [115, 139]];
  const pits = [[15, 18], [31, 34], [51, 54], [71, 74], [91, 94], [111, 114]];
  for (const [a, b] of ground) for (let y = 8; y <= 11; y++) fill(g, a, b, y, '#');
  for (const [a, b] of pits) fill(g, a, b, 11, '^');

  // bridge platforms over each pit
  for (const [a, b] of [[16, 18], [32, 34], [52, 54], [72, 74], [92, 94], [112, 114]]) fill(g, a, b, 6, '=');

  // three staircases up to the clouds that hold the commands
  fill(g, 20, 21, 4, '=');  fill(g, 22, 24, 2, 'C');  put(g, 23, 1, 'K');
  fill(g, 58, 60, 6, '=');  fill(g, 62, 63, 4, '=');  fill(g, 66, 68, 2, 'C');  put(g, 67, 1, 'K');
  fill(g, 98, 100, 6, '='); fill(g, 102, 103, 4, '='); fill(g, 106, 108, 2, 'C'); put(g, 107, 1, 'K');

  for (const x of [5, 7, 9, 21, 28, 40, 47, 60, 67, 80, 87, 100, 107, 120, 127, 131]) put(g, x, 7, '*');
  for (const x of [20, 62, 102]) put(g, x, 3, 'G');
  put(g, 76, 7, 'L'); put(g, 125, 7, 'L');

  for (const [x, y] of [[12, 4], [38, 3], [63, 4], [88, 3], [118, 4]]) put(g, x, y, 'd');
  for (const [x, y] of [[26, 3], [57, 3], [83, 3], [124, 3]]) put(g, x, y, 'g');
  for (const [x, y] of [[45, 2], [96, 2], [130, 2]]) put(g, x, y, 'h');
  for (const [x, y] of [[33, 5], [72, 5], [112, 5]]) put(g, x, y, 'b');
  for (const [x, y] of [[22, 7], [60, 7], [100, 7]]) put(g, x, y, 'l');
  for (const [x, y] of [[44, 7], [86, 7], [128, 7]]) put(g, x, y, 't');

  put(g, 3, 7, 'P');
  put(g, 138, 7, 'E');
  return { name: 'THE DREAMSCAPE', sky: '#3679f4', w, h, rows: rowsOf(g) };
}

// ------------------------------------------------------------- LEVEL 2
function level2() {
  const w = 160, h = 14;
  const g = grid(w, h);
  const ground = [[0, 12], [17, 30], [35, 50], [55, 72], [77, 92], [97, 112], [117, 134], [139, 159]];
  const pits = [[13, 16], [31, 34], [51, 54], [73, 76], [93, 96], [113, 116], [135, 138]];
  for (const [a, b] of ground) for (let y = 10; y <= 13; y++) fill(g, a, b, y, '#');
  for (const [a, b] of pits) fill(g, a, b, 13, '^');

  for (const [a, b] of [[14, 16], [32, 34], [52, 54], [74, 76], [94, 96], [114, 116], [136, 138]]) fill(g, a, b, 8, '=');

  // staircases: row8 -> row6 -> row4 -> cloud row2
  fill(g, 18, 20, 6, '=');  fill(g, 22, 24, 4, '=');  fill(g, 26, 28, 2, 'C');  put(g, 27, 1, 'K');
  fill(g, 56, 58, 8, '=');  fill(g, 60, 62, 6, '=');  fill(g, 64, 66, 4, '=');  fill(g, 68, 70, 2, 'C');  put(g, 69, 1, 'K');
  fill(g, 100, 102, 6, '='); fill(g, 104, 106, 4, '='); fill(g, 108, 110, 2, 'C'); put(g, 109, 1, 'K');

  fill(g, 140, 141, 9, 'X'); fill(g, 140, 141, 8, 'X');

  for (const x of [4, 6, 8, 20, 27, 38, 45, 60, 68, 80, 88, 100, 108, 120, 128, 145, 150, 155]) put(g, x, 9, '*');
  for (const x of [22, 64, 104]) put(g, x, 3, 'G');
  put(g, 78, 9, 'L'); put(g, 146, 7, 'L');

  for (const [x, y] of [[10, 6], [36, 5], [62, 6], [88, 5], [118, 6], [148, 5]]) put(g, x, y, 'd');
  for (const [x, y] of [[25, 4], [58, 4], [85, 4], [122, 4], [152, 4]]) put(g, x, y, 'g');
  for (const [x, y] of [[44, 3], [96, 3], [132, 3], [156, 3]]) put(g, x, y, 'h');
  for (const [x, y] of [[30, 7], [74, 7], [116, 7], [138, 7]]) put(g, x, y, 'b');
  for (const [x, y] of [[22, 9], [64, 9], [104, 9], [143, 9]]) put(g, x, y, 'l');
  for (const [x, y] of [[46, 9], [90, 9], [128, 9]]) put(g, x, y, 't');

  put(g, 3, 9, 'P');
  put(g, 158, 9, 'E');
  return { name: 'THE ASYLUM OF DREAMS', sky: '#241c38', w, h, rows: rowsOf(g) };
}

// ------------------------------------------------------------- LEVEL 3
function level3() {
  const w = 180, h = 14;
  const g = grid(w, h);
  const ground = [[0, 10], [15, 26], [31, 44], [49, 62], [67, 82], [87, 100], [105, 122], [127, 142], [147, 179]];
  const pits = [[11, 14], [27, 30], [45, 48], [63, 66], [83, 86], [101, 104], [123, 126], [143, 146]];
  for (const [a, b] of ground) for (let y = 10; y <= 13; y++) fill(g, a, b, y, '#');
  for (const [a, b] of pits) fill(g, a, b, 13, '^');

  for (const [a, b] of [[12, 14], [28, 30], [46, 48], [64, 66], [84, 86], [102, 104], [124, 126], [144, 146]]) fill(g, a, b, 8, '=');
  // spikes sitting on the ground surface
  for (const x of [20, 55, 92, 132]) put(g, x, 9, '^');

  fill(g, 16, 18, 6, '=');  fill(g, 20, 22, 4, '=');  fill(g, 24, 26, 2, 'C');  put(g, 25, 1, 'K');
  fill(g, 50, 52, 6, '=');  fill(g, 54, 56, 4, '=');  fill(g, 58, 60, 2, 'C');  put(g, 59, 1, 'K');
  fill(g, 106, 108, 6, '='); fill(g, 110, 112, 4, '='); fill(g, 114, 116, 2, 'C'); put(g, 115, 1, 'K');

  fill(g, 160, 162, 9, 'X'); fill(g, 160, 161, 8, 'X'); fill(g, 160, 160, 7, 'X');

  for (const x of [4, 6, 8, 17, 24, 34, 40, 52, 59, 70, 78, 88, 96, 108, 116, 130, 138, 150, 158, 166, 172]) put(g, x, 9, '*');
  for (const x of [20, 54, 110]) put(g, x, 3, 'G');
  put(g, 76, 9, 'L'); put(g, 128, 9, 'L'); put(g, 165, 6, 'L');

  for (const [x, y] of [[8, 5], [32, 4], [56, 5], [80, 4], [108, 5], [134, 4], [163, 5]]) put(g, x, y, 'd');
  for (const [x, y] of [[18, 4], [44, 4], [70, 4], [96, 4], [124, 4], [152, 4]]) put(g, x, y, 'g');
  for (const [x, y] of [[26, 3], [62, 3], [100, 3], [140, 3], [170, 3]]) put(g, x, y, 'h');
  for (const [x, y] of [[36, 7], [72, 7], [110, 7], [148, 7]]) put(g, x, y, 'b');
  for (const [x, y] of [[24, 9], [68, 9], [112, 9], [156, 9]]) put(g, x, y, 'l');
  for (const [x, y] of [[40, 9], [88, 9], [130, 9], [165, 9]]) put(g, x, y, 't');

  put(g, 3, 9, 'P');
  put(g, 178, 9, 'E');
  return { name: 'THE WAKING EDGE', sky: '#101026', w, h, rows: rowsOf(g) };
}

export const LEVELS = [level1(), level2(), level3()];
