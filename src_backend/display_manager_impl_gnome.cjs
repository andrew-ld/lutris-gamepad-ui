const { getSessionBus } = require("./dbus_manager.cjs");
const { spawnGSettings } = require("./utils.cjs");

const POWER_SERVICE = "org.gnome.SettingsDaemon.Power";
const POWER_PATH = "/org/gnome/SettingsDaemon/Power";
const POWER_SCREEN_INTERFACE = "org.gnome.SettingsDaemon.Power.Screen";

const NIGHT_LIGHT_SCHEMA = "org.gnome.settings-daemon.plugins.color";
const NIGHT_LIGHT_KEY = "night-light-enabled";

async function getInterface(serviceName, path, interfaceName) {
  const bus = await getSessionBus("display_manager_gnome", false);
  const service = bus.getService(serviceName);
  return new Promise((resolve, reject) => {
    service.getInterface(path, interfaceName, (err, iface) => {
      if (err) return reject(err);
      resolve(iface);
    });
  });
}

async function getBrightness() {
  const props = await getInterface(
    POWER_SERVICE,
    POWER_PATH,
    "org.freedesktop.DBus.Properties",
  );
  const variant = await new Promise((resolve, reject) => {
    props.Get(POWER_SCREEN_INTERFACE, "Brightness", (err, val) => {
      if (err) return reject(err);
      resolve(val);
    });
  });
  return variant[1][0];
}

async function setBrightness(brightness) {
  const val = parseInt(brightness, 10);
  const props = await getInterface(
    POWER_SERVICE,
    POWER_PATH,
    "org.freedesktop.DBus.Properties",
  );

  await new Promise((resolve, reject) => {
    props.Set(POWER_SCREEN_INTERFACE, "Brightness", ["i", val], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function getNightLight() {
  const result = await spawnGSettings(["get", NIGHT_LIGHT_SCHEMA, NIGHT_LIGHT_KEY]);
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
