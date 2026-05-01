const { readFileSync } = require("node:fs");

const { localeAppFile, logWarn } = require("./utils.cjs");

let controllerDbCache = null;

const FAMILY_PATTERNS = [
  { family: "playstation", pattern: /dualsense|dualshock|playstation|\bps4\b|\bps5\b|wireless controller|sony/i },
  { family: "xbox", pattern: /xbox|xinput|microsoft/i },
  { family: "nintendo", pattern: /\bswitch\b|joy-?con|pro controller|nintendo/i },
  { family: "steam", pattern: /steam deck|steam controller|valve/i },
  { family: "8bitdo", pattern: /8bitdo/i },
  { family: "generic", pattern: /gamepad|controller|joystick/i },
];

function normalizeHex(value) {
  return (value || "0000").toLowerCase().replace(/^0x/, "").padStart(4, "0");
}

function loadControllerDatabase() {
  if (controllerDbCache) {
    return controllerDbCache;
  }

  const dbPath = localeAppFile("./src_frontend/resources/gamepad_mapping_db.json");
  if (dbPath instanceof Error) {
    logWarn("controller_family_db", "controller mapping database not found");
    controllerDbCache = {};
    return controllerDbCache;
  }

  try {
    const raw = readFileSync(dbPath, "utf8");
    const parsed = JSON.parse(raw);
    controllerDbCache = parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    logWarn("controller_family_db", "unable to parse controller mapping database", error);
    controllerDbCache = {};
  }

  return controllerDbCache;
}

function inferFamilyFromName(name = "") {
  const text = name;
  for (const { family, pattern } of FAMILY_PATTERNS) {
    if (pattern.test(text)) {
      return family;
    }
  }
  return "unknown";
}

function resolveControllerIdentity(vendorId, productId, fallbackName) {
  const db = loadControllerDatabase();
  const key = `${normalizeHex(vendorId)}_${normalizeHex(productId)}`;
  const entry = db[key];
  const isRecognized = Boolean(entry?.n);
  const standardizedName = entry?.n || fallbackName;
  const family = inferFamilyFromName(standardizedName || "");

  return {
    databaseKey: key,
    isRecognized,
    standardizedName,
    family,
  };
}

module.exports = {
  resolveControllerIdentity,
};
