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
  logInfo("Using ddcutil implementation for display management");
  implementation = require("./display_manager_impl_ddcutil.cjs");
}

module.exports = {
  getBrightness: implementation.getBrightness,
  setBrightness: implementation.setBrightness,
  getNightLight: implementation.getNightLight,
  setNightLight: implementation.setNightLight,
};
