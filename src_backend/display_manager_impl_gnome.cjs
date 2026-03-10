const { spawnGSettings } = require("./utils.cjs");
const ddcutil = require("./display_manager_impl_ddcutil.cjs");

const NIGHT_LIGHT_SCHEMA = "org.gnome.settings-daemon.plugins.color";
const NIGHT_LIGHT_KEY = "night-light-enabled";

async function getBrightness() {
  return await ddcutil.getBrightness();
}

async function setBrightness(brightness) {
  await ddcutil.setBrightness(brightness);
}

async function getNightLight() {
  const result = await spawnGSettings([
    "get",
    NIGHT_LIGHT_SCHEMA,
    NIGHT_LIGHT_KEY,
  ]);
  return result === "true";
}

async function setNightLight(enabled) {
  await spawnGSettings([
    "set",
    NIGHT_LIGHT_SCHEMA,
    NIGHT_LIGHT_KEY,
    enabled ? "true" : "false",
  ]);
}

module.exports = {
  getBrightness,
  setBrightness,
  getNightLight,
  setNightLight,
};
