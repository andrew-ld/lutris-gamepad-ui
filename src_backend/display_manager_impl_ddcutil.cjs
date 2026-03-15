const { spawnDdcutil, getRunExclusive } = require("./utils.cjs");

// ddcutils is not thread-safe
const runExclusive = getRunExclusive();

async function getBrightnessInternal() {
  // format: VCP <code-hex> <type> <current-value> <max-value>
  const result = await spawnDdcutil(["getvcp", "10", "--brief"]);
  const parts = result.split("\n")[0].split(" ");

  const current = Number.parseInt(parts[3]);
  const max = Number.parseInt(parts[4]);

  return { current, max };
}

async function getBrightness() {
  return runExclusive(async () => {
    const current = await getBrightnessInternal();
    return Math.floor((current.current / current.max) * 100);
  });
}

async function setBrightness(brightness) {
  return runExclusive(async () => {
    const current = await getBrightnessInternal();
    const newValue = Math.floor((brightness / 100) * current.max);
    await spawnDdcutil(["setvcp", "10", newValue.toString()]);
  });
}

async function getNightLight() {
  throw new Error("Night light reading not supported on this environment");
}

async function setNightLight() {
  throw new Error("Night light control not supported on this environment");
}

module.exports = {
  getBrightness,
  setBrightness,
  getNightLight,
  setNightLight,
};
