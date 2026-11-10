// Renders the landing page's still image (src/assets/terrain-still.webp) from the 3D scene itself.
// The still is what visitors see first, and forever if their device gets no 3D (reduced motion, weak device...).
// Because it is drawn by the same code with the same seed, it matches the first frame of the live scene exactly,
// so the cross-fade from picture to 3D is seamless. Run it again whenever the scene's look changes.
//
// Two pictures can be made (VARIANT=landing is the default; VARIANT=auth is the brighter, closer one for the login page):
//   VARIANT=auth BASE_URL=http://localhost:5174 node scripts/make-terrain-still.mjs
//
// Needs the Vite dev server running (it serves the scene's source files to the browser):
//   cd client && npx vite --port 5174 --strictPort
// Then:
//   cd client && BASE_URL=http://localhost:5174 node scripts/make-terrain-still.mjs
// Uses the installed Microsoft Edge (no browser download). Output: client/src/assets/terrain-still.webp
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
const QUALITY = 0.8; // WebP quality, 0 to 1

// What each variant looks like. `options` go straight to createTerrainScene.
const VARIANTS = {
  landing: { file: "terrain-still.webp", width: 1600, height: 900, options: {} },
  // brighter and zoomed in, in the shape of the login page's left side, so the terrain is a real picture there
  auth: { file: "terrain-still-auth.webp", width: 1200, height: 1100, options: { intensity: 0.95, fov: 26 } },
};
const variant = VARIANTS[process.env.VARIANT ?? "landing"];
if (!variant) throw new Error(`Unknown VARIANT "${process.env.VARIANT}" (use landing or auth)`);
const { width: WIDTH, height: HEIGHT } = variant;

const outFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "assets", variant.file);
// Optional: PREVIEW_FILE=some/where.png also saves the picture on the page's real background colour, to judge it by eye
const previewFile = process.env.PREVIEW_FILE;

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/login`); // any page works: it only has to load the theme tokens and the dev server's modules

  // Runs inside the browser: draw frame 0 of the scene on an offscreen canvas and read it back as a WebP
  const dataUrl = await page.evaluate(
    async ({ width, height, quality, options }) => {
      const { createTerrainScene } = await import("/src/features/landing/components/TerrainScene.js");
      const { readThemeColors } = await import("/src/features/landing/utils/themeColors.js");

      const canvas = document.createElement("canvas");
      const scene = createTerrainScene(canvas, { colors: readThemeColors(), pixelRatioCap: 1, ...options });

      scene.resize(width, height);
      scene.renderOnce();

      // read the pixels in the same task as the render, while the canvas still holds them
      const url = canvas.toDataURL("image/webp", quality);
      scene.dispose();
      return url;
    },
    { width: WIDTH, height: HEIGHT, quality: QUALITY, options: variant.options }
  );

  const bytes = Buffer.from(dataUrl.split(",")[1], "base64");
  fs.writeFileSync(outFile, bytes);

  if (previewFile) {
    // draw the WebP over the background colour inside the browser, and save that as a PNG
    const png = await page.evaluate(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--color-background").trim();
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      return canvas.toDataURL("image/png");
    }, dataUrl);
    fs.writeFileSync(previewFile, Buffer.from(png.split(",")[1], "base64"));
    console.log(`Wrote preview ${previewFile}`);
  }
  console.log(`Wrote ${path.relative(process.cwd(), outFile)} (${WIDTH}x${HEIGHT}, ${(bytes.length / 1024).toFixed(0)} kB)`);
} finally {
  await browser.close();
}
