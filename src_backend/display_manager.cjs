const { logInfo, logWarn } = require("./utils.cjs");

const DESKTOP_GNOME = "gnome";
const DESKTOP_KDE = "kde";
const DESKTOP_OTHER = "other";

function getDesktopEnvironment() {
  const xdgCurrentDesktop = process.env.XDG_CURRENT_DESKTOP?.toLowerCase();
  if (xdgCurrentDesktop?.includes("gnome")) {
    return DESKTOP_GNOME;
  } else if (xdgCurrentDesktop?.includes("kde")) {
    return DESKTOP_KDE;
  }
  return DESKTOP_OTHER;
}

const desktop = getDesktopEnvironment();

let implementation;

if (desktop === DESKTOP_GNOME) {
  logInfo("Using GNOME implementation for display management");
  implementation = require("./display_manager_impl_gnome.cjs");
} else if (desktop === DESKTOP_KDE) {
  logInfo("Using KDE implementation for display management");
  implementation = require("./display_manager_impl_kde.cjs");
} else {
  logWarn("Display management unavailable on this desktop");
  implementation = {
    getBrightness: async () => {
      throw new Error("Brightness reading not supported on this environment");
    },
    setBrightness: async () => {
      throw new Error("Brightness control not supported on this environment");
    },
    getNightLight: async () => {
      throw new Error("Night light reading not supported on this environment");
    },
    setNightLight: async () => {
      throw new Error("Night light control not supported on this environment");
    },
  };
}

module.exports = {
  getBrightness: implementation.getBrightness,
  setBrightness: implementation.setBrightness,
  getNightLight: implementation.getNightLight,
  setNightLight: implementation.setNightLight,
};
