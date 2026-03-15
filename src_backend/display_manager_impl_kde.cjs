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
    service.getInterface(path, interfaceName, (error, iface) => {
      if (error)
        return reject(
          new Error(
            `Failed to get interface ${interfaceName}: ${error.message}`,
          ),
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
    iface.brightnessMax((error, value) => {
      if (error) return reject(error);
      resolve(value);
    });
  });

  const current = await new Promise((resolve, reject) => {
    iface.brightness((error, value) => {
      if (error) return reject(error);
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
  const value = Number.parseInt(brightness, 10);

  const max = await new Promise((resolve, reject) => {
    iface.brightnessMax((error, value) => {
      if (error) return reject(error);
      resolve(value);
    });
  });

  const target = Math.round((value / 100) * max);

  await new Promise((resolve, reject) => {
    iface.setBrightness(target, (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

async function getNightLight() {
  const iface = await getInterface(
    "org.kde.KWin.NightLight",
    "/org/kde/KWin/NightLight",
    "org.kde.KWin.NightLight",
  );

  return new Promise((resolve, reject) => {
    iface.running((error, value) => {
      if (error) return reject(error);
      resolve(value);
    });
  });
}

async function setNightLight(enabled) {
  const current = await getNightLight();
  if (current === enabled) {
    return;
  }

  const iface = await getInterface(
    "org.kde.kglobalaccel",
    "/component/kwin",
    "org.kde.kglobalaccel.Component",
  );

  await new Promise((resolve, reject) => {
    iface.invokeShortcut("Toggle Night Color", (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

module.exports = {
  getBrightness,
  setBrightness,
  getNightLight,
  setNightLight,
};
