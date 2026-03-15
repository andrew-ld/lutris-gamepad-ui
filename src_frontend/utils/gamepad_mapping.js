import database from "../resources/gamepad_mapping_db.json";

const ID_REGEX = /Vendor: ([0-9a-fA-F]{4}) Product: ([0-9a-fA-F]{4})/i;

const ID_TO_MAPPING_CACHE = new Map();

function readInstruction(gamepad, instruction) {
  if (!instruction) return 0;

  const type = instruction[0];
  const index = instruction[1];

  switch (type) {
    case 0: {
      // Button
      return gamepad.buttons[index] ? gamepad.buttons[index].value : 0;
    }
    case 1: {
      // Axis
      return gamepad.axes[index] || 0;
    }
    case 2: {
      // +Half Axis
      return Math.max(0, gamepad.axes[index] || 0);
    }
    case 3: {
      // -Half Axis
      return Math.max(0, -(gamepad.axes[index] || 0));
    }
    case 4: {
      // Hat (D-Pad)
      // Linux/Chrome Standard: D-Pad is split into the last two axes.
      // Axis N-1: Left (-1) / Right (1)
      // Axis N:   Up (-1)   / Down (1)
      const n = gamepad.axes.length;
      const axisX = gamepad.axes[n - 2] || 0;
      const axisY = gamepad.axes[n - 1] || 0;
      const dir = instruction[2];

      // 1=Up, 2=Right, 4=Down, 8=Left
      if (dir === 1 && axisY < -0.5) return 1; // Up
      if (dir === 4 && axisY > 0.5) return 1; // Down
      if (dir === 8 && axisX < -0.5) return 1; // Left
      if (dir === 2 && axisX > 0.5) return 1; // Right
      return 0;
    }
    case 5: {
      // Inverted Axis
      return -(gamepad.axes[index] || 0);
    }
    default: {
      return 0;
    }
  }
}

function getGamepadMapping(gamepad) {
  const cachedMapping = ID_TO_MAPPING_CACHE.get(gamepad.id);

  if (cachedMapping) {
    return cachedMapping;
  }

  const match = gamepad.id.match(ID_REGEX);

  if (!match) {
    return;
  }

  const vidPid = `${match[1].toLowerCase()}_${match[2].toLowerCase()}`;
  const map = database[vidPid];

  if (map) {
    ID_TO_MAPPING_CACHE.set(gamepad.id, map);
  }

  return map;
}

export function getMappedInput(gamepad) {
  const map = getGamepadMapping(gamepad);

  if (!map) {
    return;
  }

  const buttons = Array.from({ length: 24 });
  const axes = Array.from({ length: 4 });

  for (let index = 0; index < 24; index++) {
    const value = readInstruction(gamepad, map.b[index]);
    buttons[index] = {
      pressed: value > 0.5,
      touched: value > 0,
      value: value,
    };
  }

  for (let index = 0; index < 4; index++) {
    const axisConfig = map.a[index];

    if (!axisConfig) {
      axes[index] = 0;
    } else if (Array.isArray(axisConfig)) {
      axes[index] = readInstruction(gamepad, axisConfig);
    } else {
      let value = 0;
      if (axisConfig.neg)
        value -= Math.abs(readInstruction(gamepad, axisConfig.neg));
      if (axisConfig.pos)
        value += Math.abs(readInstruction(gamepad, axisConfig.pos));
      axes[index] = value;
    }
  }

  return { buttons, axes };
}
