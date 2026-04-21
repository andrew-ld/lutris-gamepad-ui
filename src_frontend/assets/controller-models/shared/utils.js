export const BTN = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  L3: 10,
  R3: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  HOME: 16,
};

export function getButtonValue(state, index) {
  return state?.buttons?.[index]?.value ?? 0;
}

export function isPressed(state, index) {
  return state?.buttons?.[index]?.pressed ?? false;
}

export function getAxis(state, index) {
  return state?.axes?.[index] ?? 0;
}

export const btnFill = (pressed, color) =>
  pressed ? color : "rgba(255,255,255,0.06)";

export const btnStroke = (pressed, color) =>
  pressed ? color : "rgba(255,255,255,0.18)";

export const txtFill = (pressed, color) =>
  pressed ? "#fff" : `${color}aa`;
