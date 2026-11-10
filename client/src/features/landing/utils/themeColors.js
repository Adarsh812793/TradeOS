// Reads the four colours the terrain needs from the theme's CSS tokens (styles/tokens.css), so the 3D follows the
// theme and no colour is ever written in JavaScript. Used by MarketTerrain.jsx and by the still-image generator, so
// the live scene and the picture can never disagree.
//   up / down  green and red: price rising and falling   neutral  a column that is not moving
//   fog        the page background: far columns fade into it
export function readThemeColors() {
  const tokens = getComputedStyle(document.documentElement);
  const token = (name) => tokens.getPropertyValue(name).trim();

  return {
    up: token("--color-success"),
    down: token("--color-danger"),
    neutral: token("--color-surface-raised"),
    fog: token("--color-background"),
  };
}
