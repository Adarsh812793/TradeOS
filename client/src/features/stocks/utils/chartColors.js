// The chart draws on a canvas, which cannot read CSS variables, so this reads the theme tokens (styles/tokens.css)
// once and hands plain colour strings to the chart. No colour is ever written in JavaScript.

// "#3DDCA0" + 0.25 -> "rgba(61, 220, 160, 0.25)" (the chart library cannot parse the tokens' modern rgb() syntax).
export function withAlpha(hex, alpha) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

// The colours and font the price chart needs, taken from the current theme.
export function readChartColors() {
  const tokens = getComputedStyle(document.documentElement);
  const token = (name) => tokens.getPropertyValue(name).trim();

  return {
    up: token("--color-success"),
    down: token("--color-danger"),
    text: token("--color-text-secondary"),
    grid: token("--color-border-subtle"),
    border: token("--color-border"),
    crosshair: token("--color-text-muted"),
    labelBackground: token("--color-surface-raised"),
    background: token("--color-surface"),
    font: token("--font-mono"),
  };
}
