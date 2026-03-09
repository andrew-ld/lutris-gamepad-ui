const { getSessionBus } = require("./dbus_manager.cjs");

const POWER_SERVICE = "org.gnome.SettingsDaemon.Power";
const POWER_PATH = "/org/gnome/SettingsDaemon/Power";
const POWER_SCREEN_INTERFACE = "org.gnome.SettingsDaemon.Power.Screen";

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

module.exports = {
  getBrightness,
  setBrightness,
};
