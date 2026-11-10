import { useEffect, useRef, useState } from "react";

import canRender3D from "../utils/canRender3D.js";
import { readThemeColors } from "../utils/themeColors.js";
import stillImage from "../../../assets/terrain-still.webp";
import "./MarketTerrain.css";

// The landing page's decorative 3D market terrain, as a background that fills its parent (the parent must be
// `position: relative`). It always starts as a still picture, which appears instantly and is all that devices without
// 3D ever get. On capable devices the live scene is loaded AFTER the page has painted and fades in over the picture.
//
// Three things keep it cheap:
//   1. LAZY: the three.js code (~130 kB gzipped) is a separate file fetched with import() only when needed, in a quiet
//      moment after first paint, and never by pages inside the app.
//   2. PAUSED when it cannot be seen: scrolled out of view (IntersectionObserver) or the tab hidden (visibilitychange).
//   3. CAPABILITY CHECK: reduced motion, data saver, weak devices and missing WebGL keep the still picture.
//
// The wrapper carries data attributes so tests and devtools can see what is happening:
//   data-terrain          "still" or "3d"          data-terrain-reason  why there is no 3D (see canRender3D)
//   data-running          "true" while frames are being drawn, "false" while paused
export default function MarketTerrain({ className = "" }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);

  // Asked once per visit: a device's capabilities do not change while the page is open
  const [support] = useState(canRender3D);

  // "still": only the picture is showing. "3d": the live scene is showing (the canvas has faded in).
  const [mode, setMode] = useState("still");

  useEffect(() => {
    if (!support.ok) return undefined;

    let cancelled = false;
    let scene = null;
    const undo = []; // functions that undo each thing set up below, run in reverse when the component goes away

    // Loads the 3D code and starts the scene. Runs in an idle moment after the first paint.
    async function boot() {
      const { createTerrainScene } = await import("./TerrainScene.js");
      if (cancelled) return;

      const wrapper = wrapperRef.current;

      try {
        scene = createTerrainScene(canvasRef.current, {
          colors: readThemeColors(),
          onContextLost: () => setMode("still"), // the graphics card dropped the scene: back to the picture
        });
      } catch {
        return; // WebGL could not start after all: the still picture simply stays
      }

      scene.resize(wrapper.clientWidth, wrapper.clientHeight);
      scene.renderOnce(); // frame 0: the very picture the still image shows, so the cross-fade is seamless
      setMode("3d");

      // Draw frames only while the terrain can actually be seen
      let isInView = true;
      let isTabVisible = !document.hidden;

      // Starts or stops the animation depending on whether anyone can see it
      function updateRunning() {
        const shouldRun = isInView && isTabVisible;

        if (shouldRun) scene.start();
        else scene.stop();

        wrapper.dataset.running = String(shouldRun);
      }

      const viewObserver = new IntersectionObserver(([entry]) => {
        isInView = entry.isIntersecting;
        updateRunning();
      });
      viewObserver.observe(wrapper);
      undo.push(() => viewObserver.disconnect());

      const handleVisibility = () => {
        isTabVisible = !document.hidden;
        updateRunning();
      };
      document.addEventListener("visibilitychange", handleVisibility);
      undo.push(() => document.removeEventListener("visibilitychange", handleVisibility));

      // Keep the drawing size in step with the space it is shown in (window resize, phone rotation)
      const sizeObserver = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;

        scene.resize(width, height);
        if (!scene.isRunning()) scene.renderOnce(); // resizing clears the canvas, so redraw while paused
      });
      sizeObserver.observe(wrapper);
      undo.push(() => sizeObserver.disconnect());

      // The camera tilts a little towards the mouse (touch screens have no hover, so they just get the slow drift)
      const handlePointer = (event) => {
        scene.setPointer((event.clientX / window.innerWidth) * 2 - 1, 1 - (event.clientY / window.innerHeight) * 2);
      };
      window.addEventListener("pointermove", handlePointer, { passive: true });
      undo.push(() => window.removeEventListener("pointermove", handlePointer));

      updateRunning();
    }

    // Wait for a quiet moment so the 3D never competes with the first paint (Safari has no requestIdleCallback)
    const idleHandle = window.requestIdleCallback
      ? window.requestIdleCallback(boot, { timeout: 2000 })
      : window.setTimeout(boot, 400);

    return () => {
      cancelled = true;

      if (window.requestIdleCallback) window.cancelIdleCallback(idleHandle);
      else window.clearTimeout(idleHandle);

      undo.reverse().forEach((fn) => fn());
      scene?.dispose(); // frees the graphics memory: without this every visit to the page would leak a scene
    };
  }, [support.ok]);

  return (
    <div
      ref={wrapperRef}
      className={`market-terrain ${className}`.trim()}
      data-terrain={mode}
      data-terrain-reason={support.ok ? undefined : support.reason}
      aria-hidden="true"
    >
      {/* fetchPriority low: the picture is decoration, so the fonts and styles the headline needs download first */}
      <img
        className="market-terrain__still"
        src={stillImage}
        alt=""
        width="1600"
        height="900"
        decoding="async"
        fetchPriority="low"
      />

      {support.ok && (
        <canvas
          ref={canvasRef}
          className={`market-terrain__canvas ${mode === "3d" ? "market-terrain__canvas--visible" : ""}`.trim()}
        />
      )}
    </div>
  );
}
