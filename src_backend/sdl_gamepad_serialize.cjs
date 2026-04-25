const W3C_BUTTON_COUNT = 17;
const W3C_AXIS_COUNT = 4;
const BYTES_PER_GAMEPAD = 4 + 4 + 6 * 4; // 4 bytes for index (Uint32), 4 for button mask, 2*4 for triggers, 4*4 for axes

function serializeGamepads(gamepads) {
  if (!gamepads || gamepads.length === 0) {
    return new Uint8Array([0]);
  }

  const numGamepads = gamepads.length;
  const buffer = new Uint8Array(1 + numGamepads * BYTES_PER_GAMEPAD);
  const view = new DataView(buffer.buffer);

  view.setUint8(0, numGamepads);
  let offset = 1;

  for (const gp of gamepads) {
    view.setUint32(offset, gp.index, true);
    offset += 4;

    let mask = 0;
    for (let b = 0; b < W3C_BUTTON_COUNT; b++) {
      if (gp.buttons[b]?.pressed) mask |= 1 << b;
    }
    view.setUint32(offset, mask, true);
    offset += 4;

    view.setFloat32(offset, gp.buttons[6]?.value || 0, true);
    offset += 4;
    view.setFloat32(offset, gp.buttons[7]?.value || 0, true);
    offset += 4;

    for (let a = 0; a < W3C_AXIS_COUNT; a++) {
      view.setFloat32(offset, gp.axes[a] || 0, true);
      offset += 4;
    }
  }

  return buffer;
}

module.exports = { serializeGamepads };
