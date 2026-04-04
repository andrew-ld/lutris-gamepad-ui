const fs = require("node:fs");

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

function parseInput(value) {
  if (!value) return null;
  if (value.startsWith("b")) return [0, Number.parseInt(value.slice(1), 10)];
  if (value.startsWith("a")) return [1, Number.parseInt(value.slice(1), 10)];
  if (value.startsWith("+a")) return [2, Number.parseInt(value.slice(2), 10)];
  if (value.startsWith("-a")) return [3, Number.parseInt(value.slice(2), 10)];
  if (value.startsWith("~a")) return [5, Number.parseInt(value.slice(2), 10)];
  if (value.startsWith("h")) {
    const parts = value.slice(1).split(".");
    return [4, Number.parseInt(parts[0], 10), Number.parseInt(parts[1], 10)];
  }
  return null;
}

function buildJson(textData) {
  const lines = textData.split("\n");
  const database = {};

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
    const vid = guid.slice(10, 12) + guid.slice(8, 10);
    const pid = guid.slice(18, 20) + guid.slice(16, 18);

    if (!vid || !pid || vid === "0000") continue;

    const vidPidKey = `${vid}_${pid}`.toLowerCase();

    const map = {
      n: name,
      b: Array.from({ length: 24 }).fill(null),
      a: Array.from({ length: 4 }).fill(null),
    };

    const splitAxes = [{}, {}, {}, {}];

    for (let index = 2; index < parts.length; index++) {
      const pair = parts[index].split(":");
      const key = pair[0];
      const value = pair[1];

      if (!key || !value) {
        continue;
      }

      const instruction = parseInput(value);

      if (STD_BTN[key] !== undefined) {
        map.b[STD_BTN[key]] = instruction;
      } else if (STD_AXIS[key] !== undefined) {
        const [axisIndex, polarity] = STD_AXIS[key];
        if (polarity === "full") {
          map.a[axisIndex] = instruction;
        } else {
          splitAxes[axisIndex][polarity] = instruction;
        }
      }
    }

    for (let index = 0; index < 4; index++) {
      if (!map.a[index] && (splitAxes[index].pos || splitAxes[index].neg)) {
        map.a[index] = splitAxes[index];
      }
    }

    database[vidPidKey] = map;
  }

  return database;
}

async function fetchAndBuildJson() {
  const response = await fetch(DB_URL);
  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  const textData = await response.text();
  const database = buildJson(textData);

  fs.writeFileSync(
    "./src_frontend/resources/gamepad_mapping_db.json",
    JSON.stringify(database),
  );

  fs.writeFileSync("./src_backend/resources/gamecontrollerdb.txt", textData);

  console.log(
    `Generated mappings for ${Object.keys(database).length} controllers.`,
  );
}

if (require.main === module) {
  fetchAndBuildJson();
}
