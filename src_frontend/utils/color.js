const PALETTE = [
  { start: "#455A64", end: "#263238" }, // Blue Grey
  { start: "#3D524F", end: "#2A3836" }, // Dark Slate Green
  { start: "#4E4440", end: "#332D2A" }, // Warm Charcoal
  { start: "#394263", end: "#242A42" }, // Deep Indigo Grey
  { start: "#594451", end: "#3D2D37" }, // Dark Mauve
  { start: "#2E535C", end: "#1D353A" }, // Muted Sea Green
  { start: "#424242", end: "#1F1F1F" }, // Neutral Dark Grey
  { start: "#2A3A4A", end: "#1A242E" }, // Deep Slate Blue
];

const stringToHash = (str) => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
};

export const getDeterministicGradient = (str) => {
  if (!str) return PALETTE[0];
  const hash = stringToHash(str);
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
};
