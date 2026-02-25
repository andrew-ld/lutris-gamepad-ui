const fs = require("fs");

const DB_URL =
  "https://raw.githubusercontent.com/mdqinc/SDL_GameControllerDB/refs/heads/master/gamecontrollerdb.txt";

const STD_BTN = {
  a: 0,
  b: 1,
  x: 2,
  y: 3,
  leftshoulder: 4,
  rightshoulder: 5,
  lefttrigger: 6,
  righttrigger: 7,
  back: 8,
  start: 9,
  leftstick: 10,
  rightstick: 11,
  dpup: 12,
  dpdown: 13,
  dpleft: 14,
  dpright: 15,
  guide: 16,
  touchpad: 17,
  misc1: 18,
  misc2: 19,
  paddle1: 20,
  paddle2: 21,
  paddle3: 22,
  paddle4: 23,
};

const STD_AXIS = {
  leftx: [0, "full"],
  "-leftx": [0, "neg"],
  "+leftx": [0, "pos"],
  lefty: [1, "full"],
  "-lefty": [1, "neg"],
  "+lefty": [1, "pos"],
  rightx: [2, "full"],
  "-rightx": [2, "neg"],
  "+rightx": [2, "pos"],
  righty: [3, "full"],
  "-righty": [3, "neg"],
  "+righty": [3, "pos"],
};

function parseInput(val) {
  if (!val) return null;
  if (val.startsWith("b")) return [0, parseInt(val.slice(1), 10)];
  if (val.startsWith("a")) return [1, parseInt(val.slice(1), 10)];
  if (val.startsWith("+a")) return [2, parseInt(val.slice(2), 10)];
  if (val.startsWith("-a")) return [3, parseInt(val.slice(2), 10)];
  if (val.startsWith("~a")) return [5, parseInt(val.slice(2), 10)];
  if (val.startsWith("h")) {
    const parts = val.slice(1).split(".");
    return [4, parseInt(parts[0], 10), parseInt(parts[1], 10)];
  }
  return null;
}

async function fetchAndBuildJson() {
  const response = await fetch(DB_URL);
  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  const textData = await response.text();
  const lines = textData.split("\n");
  const db = {};

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    if (!line.includes("platform:Linux")) {
      continue;
    }

    const parts = line.split(",");
    const guid = parts[0];
    const name = parts[1];

    // Decode VID/PID from SDL GUID (Little Endian)
    const vid = guid.substring(10, 12) + guid.substring(8, 10);
    const pid = guid.substring(18, 20) + guid.substring(16, 18);

    if (!vid || !pid || vid === "0000") continue;

    const vidPidKey = `${vid}_${pid}`.toLowerCase();

    const map = {
      n: name,
      b: new Array(24).fill(null),
      a: new Array(4).fill(null),
    };

    const splitAxes = [{}, {}, {}, {}];

    for (let i = 2; i < parts.length; i++) {
      const pair = parts[i].split(":");
      const key = pair[0];
      const value = pair[1];

      if (!key || !value) {
        continue;
      }

      const instruction = parseInput(value);

      if (STD_BTN[key] !== undefined) {
        map.b[STD_BTN[key]] = instruction;
      } else if (STD_AXIS[key] !== undefined) {
        const [axisIdx, polarity] = STD_AXIS[key];
        if (polarity === "full") {
          map.a[axisIdx] = instruction;
        } else {
          splitAxes[axisIdx][polarity] = instruction;
        }
      }
    }

    for (let i = 0; i < 4; i++) {
      if (!map.a[i] && (splitAxes[i].pos || splitAxes[i].neg)) {
        map.a[i] = splitAxes[i];
      }
    }

    db[vidPidKey] = map;
  }

  fs.writeFileSync(
    "./src_frontend/resources/gamepad_mapping_db.json",
    JSON.stringify(db),
  );

  console.log(`Generated mappings for ${Object.keys(db).length} controllers.`);
}

fetchAndBuildJson();
