const { getSessionBus } = require("./dbus_manager.cjs");

const BRIGHTNESS_SERVICE = "org.kde.Solid.PowerManagement";
const BRIGHTNESS_PATH =
  "/org/kde/Solid/PowerManagement/Actions/BrightnessControl";
const BRIGHTNESS_INTERFACE =
  "org.kde.Solid.PowerManagement.Actions.BrightnessControl";

async function getInterface(serviceName, path, interfaceName) {
  const bus = await getSessionBus("display_manager_kde", false);
  const service = bus.getService(serviceName);
  return new Promise((resolve, reject) => {
    service.getInterface(path, interfaceName, (err, iface) => {
      if (err)
        return reject(
          new Error(`Failed to get interface ${interfaceName}: ${err.message}`),
        );
      resolve(iface);
    });
  });
}

async function getBrightness() {
  const iface = await getInterface(
    BRIGHTNESS_SERVICE,
    BRIGHTNESS_PATH,
    BRIGHTNESS_INTERFACE,
  );

  const max = await new Promise((resolve, reject) => {
    iface.brightnessMax((err, value) => {
      if (err) return reject(err);
      resolve(value);
    });
  });

  const current = await new Promise((resolve, reject) => {
    iface.brightness((err, value) => {
      if (err) return reject(err);
      resolve(value);
    });
  });

  if (max <= 0) return current;
  return Math.round((current / max) * 100);
}

async function setBrightness(brightness) {
  const iface = await getInterface(
    BRIGHTNESS_SERVICE,
    BRIGHTNESS_PATH,
    BRIGHTNESS_INTERFACE,
  );
  const val = parseInt(brightness, 10);

  const max = await new Promise((resolve, reject) => {
    iface.brightnessMax((err, value) => {
      if (err) return reject(err);
      resolve(value);
    });
  });

  const target = Math.round((val / 100) * max);

  await new Promise((resolve, reject) => {
    iface.setBrightness(target, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = {
  getBrightness,
  setBrightness,
};
