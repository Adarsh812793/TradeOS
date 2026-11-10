// Decides whether this visitor gets the live 3D terrain or just the still image.
// Returns { ok: true } or { ok: false, reason }, where reason is one of:
//   "reduced-motion"  the visitor asked their system for less animation (an accessibility setting: always respected)
//   "save-data"       the browser is in data-saver mode (do not download ~130 kB of 3D code for decoration)
//   "low-cpu"         two or fewer processor cores: probably a weak device
//   "low-memory"      under 2 GB of memory (only some browsers report this)
//   "no-webgl"        WebGL is missing, disabled, or only available as slow software rendering
// The still image is always there as the fallback, so saying "no" here only ever costs the visitor an animation.
export default function canRender3D() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { ok: false, reason: "reduced-motion" };
  }

  if (navigator.connection?.saveData) {
    return { ok: false, reason: "save-data" };
  }

  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
    return { ok: false, reason: "low-cpu" };
  }

  if (navigator.deviceMemory && navigator.deviceMemory < 2) {
    return { ok: false, reason: "low-memory" };
  }

  if (!hasFastWebGL()) {
    return { ok: false, reason: "no-webgl" };
  }

  return { ok: true };
}

// True when the browser can make a hardware-accelerated WebGL context. `failIfMajorPerformanceCaveat` makes the
// browser refuse to give a context that is only software-emulated (which would run the terrain at a few frames a second).
function hasFastWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const options = { failIfMajorPerformanceCaveat: true };
    const gl = canvas.getContext("webgl2", options) || canvas.getContext("webgl", options);

    if (!gl) return false;

    // Browsers allow only a handful of WebGL contexts at once, so give this test one back straight away
    gl.getExtension("WEBGL_lose_context")?.loseContext();

    return true;
  } catch {
    return false;
  }
}
