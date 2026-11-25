// The three.js part of the landing page's market terrain. This is the ONLY file that imports "three", and it is only
// ever loaded with a dynamic import() from MarketTerrain.jsx, so the ~130 kB of 3D code never reaches pages inside the
// app. The simulation itself (heights, colours) lives in ../utils/terrain.utils.js; this file only draws it.
//
// HOW IT IS DRAWN (instanced rendering): the terrain is ~1,100 columns, but they are ONE mesh. Drawing a thousand
// separate meshes would cost a thousand "draw calls" (each one a round trip to the graphics card); an InstancedMesh
// draws the same box shape a thousand times in a single call, and we only tell it, per column, a position, a height
// and a colour. That is what keeps this cheap enough for a phone.
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  InstancedMesh,
  BoxGeometry,
  MeshLambertMaterial,
  Object3D,
  Color,
  AmbientLight,
  DirectionalLight,
  Fog,
} from "three";

import { GRID, STEP_SECONDS, createTerrainState, stepWalk, advance } from "../utils/terrain.utils.js";

const SPACING = 1; // distance between column centres
const BASE_FOV = 35; // camera field of view in degrees (a narrow one makes the perspective calm, like a long lens)
const COLUMN_SIZE = 0.78; // a column is a little narrower than its cell, so there are thin gaps between them
const HEIGHT_SCALE = 0.5; // simulation height units -> world units: keeps the columns low, like terrain, not skyscrapers
const COLOUR_INTENSITY = 0.62; // dims every colour so the terrain stays a background and text on top stays readable
const PORTRAIT_SHIFT = 7.5; // how far (world units) the camera moves into the grid on the tallest screens, see resize()

// Creates the terrain on a <canvas> and returns the handle MarketTerrain.jsx works with.
//   colors        { up, down, neutral, fog }: CSS colour strings (read from the theme tokens by the caller)
//   seed          the same seed always gives the same first picture, which is what makes the still image match
//   pixelRatioCap the most pixels per CSS pixel to draw: high-density screens would otherwise multiply the work
//   intensity     how strong the colours are (default COLOUR_INTENSITY: dim, for a background behind text)
//   fov           the camera's field of view in degrees (default BASE_FOV); a smaller one zooms in, giving bigger columns
//   portraitShift how far the camera moves into the grid on a tall (phone) screen (default PORTRAIT_SHIFT); 0 = no move
//   onContextLost called if the graphics card drops the scene (the page then falls back to the still image)
export function createTerrainScene(
  canvas,
  { colors, seed = 7, pixelRatioCap = 1.5, intensity = COLOUR_INTENSITY, fov = BASE_FOV, portraitShift = PORTRAIT_SHIFT, onContextLost } = {}
) {
  const { columns, rows } = GRID;
  const state = createTerrainState({ columns, rows, seed });

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0); // transparent: the page's own background shows through

  const scene = new Scene();
  const depth = rows * SPACING;
  const camera = new PerspectiveCamera(fov, 16 / 9, 0.1, 200);
  // x is half a column off-centre: with an even number of columns the exact middle is a GAP, and looking straight
  // down a gap showed up as a dark lane running up the picture
  const cameraHome = { x: SPACING / 2, y: depth * 0.55, z: depth / 2 + depth * 0.62 }; // above and behind the near edge
  const lookAt = { x: SPACING / 2, y: 0, z: -depth * 0.2 }; // aimed towards the far side, so the near rows run off the bottom of the screen

  // Far columns fade into the page background. The fade is measured from the camera's distance to the grid's centre,
  // so it works the same for the big (desktop) and small (phone) grids.
  const distance = Math.hypot(cameraHome.y, cameraHome.z - lookAt.z);
  scene.fog = new Fog(new Color(colors.fog), distance * 0.62, distance * 1.3);
  camera.position.set(cameraHome.x, cameraHome.y, cameraHome.z);
  camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

  scene.add(new AmbientLight(0xffffff, 0.85));
  const sun = new DirectionalLight(0xffffff, 1.2);
  sun.position.set(-8, 16, 10);
  scene.add(sun);

  // One box that all columns share. Moving its origin to the bottom face (translate) means scaling a column in y
  // makes it grow UP from the ground instead of growing both ways from its middle.
  const geometry = new BoxGeometry(1, 1, 1);
  geometry.translate(0, 0.5, 0);
  const material = new MeshLambertMaterial();
  const mesh = new InstancedMesh(geometry, material, state.count);
  mesh.frustumCulled = false; // the columns are spread over the whole grid: do not let three.js cull by the one box's bounds
  scene.add(mesh);

  const up = new Color(colors.up);
  const down = new Color(colors.down);
  const neutral = new Color(colors.neutral);
  const tint = new Color(); // reused for every column, so no garbage is made per frame
  const placer = new Object3D(); // a scratch object used only to build each column's position/scale matrix

  // Writes every column's current position, height and colour into the instanced mesh.
  // Colour: neutral when a column is resting, blending towards green (mix > 0) or red (mix < 0) as it moves.
  function updateInstances() {
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const index = row * columns + column;
        const mix = state.mix[index];

        placer.position.set((column - (columns - 1) / 2) * SPACING, 0, (row - (rows - 1) / 2) * SPACING);
        placer.scale.set(COLUMN_SIZE, state.height[index] * HEIGHT_SCALE, COLUMN_SIZE);
        placer.updateMatrix();
        mesh.setMatrixAt(index, placer.matrix);

        tint.copy(neutral).lerp(mix >= 0 ? up : down, Math.abs(mix)).multiplyScalar(intensity);
        mesh.setColorAt(index, tint);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }

  // Slow camera drift plus a gentle tilt that follows the mouse: the only camera motion
  let elapsed = 0;
  const pointer = { x: 0, y: 0 };
  const pointerTarget = { x: 0, y: 0 };

  // How far the camera has moved along the grid (towards the far side) for the current screen shape; set by resize().
  let shiftZ = 0;

  // Moves the camera for this moment: a slow sideways sway, plus the mouse offset (eased so it never jerks).
  function placeCamera() {
    camera.position.x = cameraHome.x + Math.sin(elapsed * 0.07) * 2.2 + pointer.x * 1.6;
    camera.position.y = cameraHome.y + pointer.y * 0.8;
    camera.position.z = cameraHome.z - shiftZ;
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z - shiftZ);
  }

  // Advances the terrain by `dt` seconds and draws one frame.
  let stepTimer = STEP_SECONDS;
  let frameCount = 0;

  function frame(dt) {
    // No time passed (the browser can deliver two frames with the same timestamp) or the time is not a number:
    // skip the frame. The simulation divides by dt, and 0 / 0 once turned every column black for good.
    if (!(dt > 0)) return;

    // A long gap (a throttled background tab, a debugger pause) must not make the terrain lurch forward
    dt = Math.min(dt, 0.1);

    stepTimer -= dt;
    while (stepTimer <= 0) {
      stepWalk(state);
      stepTimer += STEP_SECONDS;
    }
    advance(state, dt);

    elapsed += dt;
    const ease = 1 - Math.exp(-dt * 2);
    pointer.x += (pointerTarget.x - pointer.x) * ease;
    pointer.y += (pointerTarget.y - pointer.y) * ease;
    placeCamera();

    updateInstances();
    renderer.render(scene, camera);
    frameCount++;
  }

  // The animation loop. three.js calls this once per screen refresh (requestAnimationFrame) while it is running.
  let lastTime = null;
  let running = false;

  function loop(time) {
    if (lastTime !== null) frame((time - lastTime) / 1000);
    lastTime = time;
  }

  // Starts drawing frames. Safe to call when already running.
  function start() {
    if (running) return;
    running = true;
    lastTime = null; // so the first frame after a pause does not see a huge time gap
    renderer.setAnimationLoop(loop);
  }

  // Stops drawing frames (the last picture stays on the canvas). While stopped the page uses no graphics power.
  function stop() {
    if (!running) return;
    running = false;
    renderer.setAnimationLoop(null);
  }

  // Draws the current state once, without advancing time (the first call gives the picture the still image shows).
  function renderOnce() {
    placeCamera();
    updateInstances();
    renderer.render(scene, camera);
  }

  // Matches the drawing size to the space it is shown in. Narrow (portrait) screens get a wider field of view so the
  // terrain still fills the width instead of showing only the middle slice. A wider view also looks further DOWN, past
  // the grid's near edge, where there are no columns: that showed as an empty band at the bottom of a phone screen. So
  // as the screen gets taller the whole camera also moves forward into the grid, by up to `portraitShift`, which brings
  // the near edge down to the bottom of the screen (the landscape view, aspect 1.5 and wider, is not moved at all).
  function resize(width, height) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    renderer.setSize(width, height, false); // false: the stylesheet decides the canvas's CSS size

    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = aspect >= 1.5 ? fov : fov + (1.5 - aspect) * 26;
    shiftZ = portraitShift * Math.min(1, Math.max(0, (1.5 - aspect) / 1.04)); // 1.04 = 1.5 minus a typical phone's 0.46
    camera.updateProjectionMatrix();
  }

  // Tells the scene where the mouse is, as -1 .. 1 across the window (the camera tilts a little towards it).
  function setPointer(x, y) {
    pointerTarget.x = x;
    pointerTarget.y = y;
  }

  // If the graphics card drops the scene, stop drawing and tell the page so it can show the still image instead.
  function handleContextLost(event) {
    event.preventDefault();
    stop();
    onContextLost?.();
  }
  canvas.addEventListener("webglcontextlost", handleContextLost);

  // Frees everything held on the graphics card. Call it when the page leaves, or the memory would leak.
  function dispose() {
    stop();
    canvas.removeEventListener("webglcontextlost", handleContextLost); // before forceContextLoss, which would trigger it
    mesh.dispose();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return {
    start,
    stop,
    renderOnce,
    resize,
    setPointer,
    dispose,
    isRunning: () => running,
    getFrameCount: () => frameCount, // for tests and devtools: proves that drawing really pauses
  };
}
