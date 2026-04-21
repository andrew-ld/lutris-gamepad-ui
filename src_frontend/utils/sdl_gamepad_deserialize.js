const W3C_BUTTON_COUNT = 17;
const W3C_AXIS_COUNT = 4;

export function deserializeGamepads(buffer) {
  if (!buffer || buffer.length === 0) return [];

  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  const numGamepads = view.getUint8(0);
  if (numGamepads === 0) return [];

  const gamepads = Array.from({ length: numGamepads });
  let offset = 1;

  for (let i = 0; i < numGamepads; i++) {
    const index = view.getUint8(offset);
    offset += 1;

    const mask = view.getUint32(offset, true);
    offset += 4;

    const l2Value = view.getFloat32(offset, true);
    offset += 4;
    const r2Value = view.getFloat32(offset, true);
    offset += 4;

    const buttons = Array.from({ length: W3C_BUTTON_COUNT });
    for (let b = 0; b < W3C_BUTTON_COUNT; b++) {
      const pressed = (mask & (1 << b)) !== 0;
      let value = pressed ? 1 : 0;
      if (b === 6) value = l2Value;
      else if (b === 7) value = r2Value;
      buttons[b] = { pressed, value };
    }

    const axes = Array.from({ length: W3C_AXIS_COUNT });
    for (let a = 0; a < W3C_AXIS_COUNT; a++) {
      axes[a] = view.getFloat32(offset, true);
      offset += 4;
    }

    gamepads[i] = { index, mapping: "standard", buttons, axes };
  }

  return gamepads;
}
