// The simulation behind the landing page's market terrain: pure maths, no three.js and no DOM, so it can be tested on
// its own and is repeatable (a seeded random generator gives the same terrain every time).
//
// THE PICTURE: a grid of columns, like a city skyline. Each column's height is a small random walk that is gently
// pulled back towards a baseline shape. A column glows green while it is rising and red while it is falling, like a
// price, and the faster it moves the brighter it glows (a resting column stays dark). This is decoration: none of
// the numbers are real market data.

// The grid: 44 x 26 = 1,144 columns. That is nothing for a graphics card (they are drawn as one instanced mesh), so
// every device gets the same grid, which also keeps the still image identical to the live scene everywhere.
export const GRID = { columns: 44, rows: 26 };

// Every column takes one random-walk step this often (seconds). Between steps the heights glide smoothly.
export const STEP_SECONDS = 0.35;

// Steps simulated before the first frame, so the very first picture already has green and red patches
// (and so the still image, which shows this first frame, is not a flat grey field).
const WARMUP_STEPS = 60;

const MIN_HEIGHT = 0.25;
const MAX_HEIGHT = 8;

// The random walk's knobs (tuned by simulation, see the notes in the project history):
//   DRIFT_KEEP   how much of the momentum survives each step: high = long runs of rising or falling
//   DRIFT_NOISE  how hard each step pushes the momentum
//   PULL         how strongly a column is drawn back to its baseline, so the skyline keeps its shape for hours
const DRIFT_KEEP = 0.95;
const DRIFT_NOISE = 0.04;
const PULL = 0.14;

// The speed (height units per second) at which a column glows at full strength. Slower columns glow in proportion.
// The colour is a smooth function of the smoothed speed, with no on/off thresholds: an earlier version with
// "rising / resting / falling" limits made columns flip in and out of states every few seconds, which looked like
// flicker, and tinted almost every column, which was far too busy behind text.
const FULL_GLOW_SPEED = 0.3;

// Smoothing speeds (per second). The speed is smoothed slowly so the colour follows the TREND, not every single step.
const GLIDE_SPEED = 3;
const VELOCITY_SMOOTHING = 1.5;
const COLOUR_EASING = 3;

// A seeded random number generator (mulberry32): the same seed always gives the same sequence of numbers in [0, 1).
export function createRandom(seed) {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A normally distributed random number (mean 0, spread 1), made from two uniform ones (the Box-Muller transform).
export function randomNormal(random) {
  const u1 = 1 - random(); // 1 - random() keeps it above 0, because log(0) is minus infinity
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// The "skyline" a column is pulled back towards: a few overlapping waves, taller towards the far side of the grid
// (row 0 is the far side) so the terrain rises into the distance.
export function baselineHeight(column, row, columns, rows) {
  const x = column / columns;
  const z = row / rows;

  const ridge = Math.sin(x * Math.PI * 3.2 + 0.6) * Math.cos(z * Math.PI * 2.1);
  const swell = Math.sin(x * Math.PI * 7 + z * Math.PI * 4);
  const distance = 1 - z;

  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, 1.5 + ridge * 1.3 + swell * 0.4 + distance * 1.3));
}

// Builds the starting state of the whole terrain: one entry per column in typed arrays (fast to loop over).
//   value     where the random walk currently is (the height the column is heading for)
//   height    the smoothed height that is actually drawn
//   drift     the walk's momentum: it makes runs of rising and falling instead of pure jitter
//   velocity  how fast the drawn height is changing, smoothed
//   mix       -1 (full red) .. 0 (dark) .. +1 (full green): the glow, easing towards velocity / FULL_GLOW_SPEED
export function createTerrainState({ columns, rows, seed }) {
  const count = columns * rows;
  const random = createRandom(seed);

  const state = {
    columns,
    rows,
    count,
    random,
    base: new Float32Array(count),
    value: new Float32Array(count),
    height: new Float32Array(count),
    drift: new Float32Array(count),
    velocity: new Float32Array(count),
    mix: new Float32Array(count),
  };

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column;
      const base = baselineHeight(column, row, columns, rows);

      state.base[index] = base;
      state.value[index] = base + randomNormal(random) * 0.3;
      state.height[index] = state.value[index];
    }
  }

  // Let the terrain "live" for a while before anyone looks at it
  for (let step = 0; step < WARMUP_STEPS; step++) {
    stepWalk(state);
    advance(state, STEP_SECONDS);
  }

  return state;
}

// One random-walk step for every column: pulled back gently towards its baseline, pushed by a momentum that changes
// slowly (so a column tends to keep rising or keep falling for a few steps).
export function stepWalk(state) {
  const { count, base, value, drift, random } = state;

  for (let i = 0; i < count; i++) {
    drift[i] = drift[i] * DRIFT_KEEP + randomNormal(random) * DRIFT_NOISE;

    const pull = (base[i] - value[i]) * PULL;

    value[i] = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, value[i] + pull + drift[i]));
  }
}

// Moves the drawn state forward by `dt` seconds: heights glide towards their random-walk value, then speed and
// colour follow. `1 - exp(-dt * k)` is a smoothing factor that is frame-rate independent (a slow and a fast
// computer end up at the same place after the same real time).
export function advance(state, dt) {
  // A frame in which no time passed (the browser sometimes delivers two frames with the same timestamp) has nothing to
  // simulate, and the speed below divides by dt: 0 / 0 is NaN, which spread to every column, turned the colours black
  // and never washed out. A negative or NaN dt is just as meaningless, so they are all skipped.
  if (!(dt > 0)) return;

  const { count, value, height, velocity, mix } = state;

  const glide = 1 - Math.exp(-dt * GLIDE_SPEED);
  const speedSmoothing = 1 - Math.exp(-dt * VELOCITY_SMOOTHING);
  const colourEasing = 1 - Math.exp(-dt * COLOUR_EASING);

  for (let i = 0; i < count; i++) {
    // Self-healing: if a NaN ever got into a column for any other reason, start that column over instead of letting
    // it poison every later frame (NaN never washes out by itself)
    if (!Number.isFinite(height[i])) height[i] = value[i];
    if (!Number.isFinite(velocity[i])) velocity[i] = 0;
    if (!Number.isFinite(mix[i])) mix[i] = 0;

    const before = height[i];
    height[i] += (value[i] - before) * glide;

    velocity[i] += ((height[i] - before) / dt - velocity[i]) * speedSmoothing;

    // glow: the speed as a fraction of full-glow speed, kept within -1 .. 1, which the colour eases towards
    const glow = Math.max(-1, Math.min(1, velocity[i] / FULL_GLOW_SPEED));
    mix[i] += (glow - mix[i]) * colourEasing;
  }
}
