import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "../contexts/TranslationContext";
import { useScopedInput } from "../hooks/useScopedInput";
import * as api from "../utils/ipc";

import DialogLayout from "./DialogLayout";

import "../styles/ControllerTester.css";

const BTN = {
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

function getButtonValue(state, index) {
  return state?.buttons?.[index]?.value ?? 0;
}

function isPressed(state, index) {
  return state?.buttons?.[index]?.pressed ?? false;
}

function getAxis(state, index) {
  return state?.axes?.[index] ?? 0;
}

const btnFill = (pressed, color) =>
  pressed ? color : "rgba(255,255,255,0.06)";
const btnStroke = (pressed, color) =>
  pressed ? color : "rgba(255,255,255,0.18)";
const txtFill = (pressed, color) =>
  pressed ? "#fff" : `${color}aa`;

const TriggerMeter = ({ x, y, width, label, value, accent, align = "start" }) => {
  const barX = align === "center" ? -(width / 2) : align === "end" ? -width : 0;
  const labelX = align === "center" ? 0 : align === "end" ? 0 : 0;
  const textAnchor = align === "center" ? "middle" : align === "end" ? "end" : "start";

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={labelX} y="-5" textAnchor={textAnchor} fontSize="10" fill="rgba(255,255,255,0.34)" fontFamily="monospace">
        {label} {Math.round(value * 100)}%
      </text>
      <rect x={barX} y="0" width={width} height="7" rx="3.5" fill="rgba(255,255,255,0.05)" />
      <rect x={barX} y="0" width={width * value} height="7" rx="3.5" fill={accent} opacity={0.4 + value * 0.6} />
    </g>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Xbox One Controller — e7d/gamepad-viewer SVG paths (MIT)
   viewBox matches the original 750 × 630.455 base
   ═══════════════════════════════════════════════════════════════ */

const XboxModel = ({ s }) => {
  const stickTravel = 25;
  const lx = 185.468 + getAxis(s, 0) * stickTravel;
  const ly = 279.865 + getAxis(s, 1) * stickTravel;
  const rx = 473.042 + getAxis(s, 2) * stickTravel;
  const ry = 393.815 + getAxis(s, 3) * stickTravel;
  const lt = getButtonValue(s, BTN.LT);
  const rt = getButtonValue(s, BTN.RT);
  const accent = "#107c10";

  return (
    <svg className="ct-svg" viewBox="0 0 750 660" xmlns="http://www.w3.org/2000/svg">

      {/* ── Base body (from e7d/gamepad-viewer xbox-one/base-black.svg, MIT) ── */}
      <path d="M664.368 213.96c-6.72-16.682-20.542-20.877-21.818-22.003-11.701-10.336-2.474-21.214-19.946-30.695-18.278-9.914-71.979-36.997-114.22-31.375-9.225 1.235-27.837 17.608-41.214 17.608H282.84c-13.377 0-31.99-16.374-41.215-17.608-42.248-5.622-95.939 21.461-114.22 31.375-17.472 9.481-8.243 20.359-19.941 30.695-1.281 1.125-15.104 5.321-21.823 22.003C22.889 369.983-1.741 469.114.095 529.129c2.891 94.416 76.578 101.326 76.578 101.326 37.033-8.617 111.55-129.135 168.535-129.135h259.594c56.985 0 131.502 120.518 168.538 129.135 0 0 73.678-6.91 76.563-101.326 1.864-60.015-22.81-159.146-85.535-315.169z" fill="#0a0a0a" />
      <path d="M664.368 213.96c-3.344-8.304-8.445-13.518-12.894-16.797-3.021-2.237-5.732-3.563-7.392-4.378-.772-.384-1.313-.642-1.527-.819-33.563-18.007-97.459-38.153-117.479-34.305-26.01 5.024-65.536 79.714-88.969 79.714H315.123c-23.435 0-62.966-74.69-88.973-79.714-19.583-3.779-85.589 16.456-118.749 34.331-.214.163-.614.362-1.155.65-1.761.849-5.067 2.418-8.698 5.268-4.194 3.308-8.812 8.352-11.911 16.051C22.889 369.983-1.741 469.114.095 529.129c2.891 94.416 76.578 101.326 76.578 101.326 37.033-8.617 111.55-129.135 168.535-129.135h259.594c56.985 0 131.502 120.518 168.538 129.135 0 0 73.678-6.91 76.563-101.326 1.864-60.015-22.81-159.146-85.535-315.169z" fill="#050505" />

      {/* ── D-Pad well & cross ── */}
      <path d="M277.671 462.114c-33.437 0-60.64-27.197-60.64-60.627 0-33.428 27.203-60.623 60.64-60.623 33.428 0 60.624 27.195 60.624 60.623 0 33.43-27.196 60.627-60.624 60.627z" fill="#0a0a0a" />
      <path d="M277.671 341.865c32.876 0 59.624 26.747 59.624 59.623 0 32.878-26.747 59.627-59.624 59.627-32.885 0-59.64-26.749-59.64-59.627.001-32.878 26.755-59.623 59.64-59.623m0-2c-34.036 0-61.64 27.577-61.64 61.623 0 34.05 27.604 61.627 61.64 61.627 34.037 0 61.624-27.577 61.624-61.627 0-34.046-27.587-61.623-61.624-61.623z" fill="#0D0808" />
      <path d="M277.671 452.698c-7.132 0-12.742-1.323-13.049-3.078a1.058 1.058 0 0 1-.014-.148v-34.424a.5.5 0 0 0-.5-.5h-34.42c-1.82 0-3.246-5.735-3.246-13.057s1.426-13.057 3.246-13.057h34.42a.5.5 0 0 0 .5-.5v-34.429c0-.043.007-.093.014-.144l.06-.227c.029-.041.066-.107.082-.134.495-.81 2.105-1.517 4.535-1.991.295-.064.592-.127.889-.183.351-.063.658-.112.958-.136a1.76 1.76 0 0 0 .162-.025c.255-.029.579-.072.907-.111a42.27 42.27 0 0 1 2.041-.189l2.369-.077c.353-.009.701-.015 1.047-.015 7.325 0 13.063 1.418 13.063 3.229l.001 34.427a.5.5 0 0 0 .5.5h34.419c1.809 0 3.226 5.734 3.226 13.059 0 7.319-1.417 13.057-3.226 13.057h-34.419a.5.5 0 0 0-.5.5v34.424a.943.943 0 0 1-.015.152c-.306 1.754-5.917 3.077-13.05 3.077z" fill="#141414" />

      {/* ── View / Menu buttons ── */}
      <path d="M430.126 280.366c0 8.902-7.229 16.103-16.102 16.103-8.902 0-16.103-7.201-16.103-16.103 0-8.896 7.198-16.103 16.103-16.103 8.873.001 16.102 7.208 16.102 16.103z" fill="#0A0A0A" stroke="#000" strokeMiterlimit="10" />
      <path d="M322.121 280.366c0 8.902-7.201 16.103-16.103 16.103-8.872 0-16.104-7.201-16.104-16.103 0-8.896 7.231-16.103 16.104-16.103 8.902.001 16.103 7.208 16.103 16.103z" fill="#0A0A0A" stroke="#000" strokeMiterlimit="10" />

      {/* ── Face plate / Top bar ── */}
      <path d="M375.615 156.499s-88.917-1.067-100.548-2.973l-16.384 30.538c20.238 23.271 41.583 53.312 56.441 53.312H436.11c14.872 0 36.194-30.041 56.463-53.312l-16.383-30.538c-11.63 1.905-100.575 2.973-100.575 2.973z" fill="#1A1A1A" />
      <path d="M476.191 153.526l-3.641-6.778c-1.854.48-3.65.748-5.384.748h-184.33c-1.392 0-2.818-.189-4.282-.501l-3.49 6.531c11.631 1.905 100.548 2.973 100.548 2.973s88.948-1.068 100.579-2.973z" fill="#0D0D0D" />

      {/* ── Left stick well ── */}
      <g strokeWidth="2" strokeMiterlimit="10">
        <path d="M185.468 351.49c-37.328 0-67.695-30.365-67.695-67.688 0-37.323 30.366-67.686 67.695-67.686 37.336 0 67.707 30.363 67.707 67.686 0 37.323-30.37 67.688-67.707 67.688z" fill="#080808" stroke="#140C0C" />
        <path d="M241.571 279.865c0 30.977-25.106 56.084-56.103 56.084-30.981 0-56.092-25.107-56.092-56.084 0-31 25.111-56.106 56.092-56.106 30.997 0 56.103 25.106 56.103 56.106z" fill="none" stroke="#120B0B" />
      </g>

      {/* ── Right stick well ── */}
      <g strokeWidth="2" strokeMiterlimit="10">
        <path d="M473.042 465.461c-37.324 0-67.688-30.364-67.688-67.686 0-37.326 30.363-67.706 67.688-67.706 37.322 0 67.707 30.379 67.707 67.706 0 37.323-30.385 67.686-67.707 67.686z" fill="#080808" stroke="#140C0C" />
        <path d="M529.151 393.815c0 30.999-25.106 56.104-56.109 56.104-30.975 0-56.083-25.104-56.083-56.104 0-30.979 25.108-56.086 56.083-56.086 31.003 0 56.109 25.107 56.109 56.086z" fill="none" stroke="#120B0B" />
      </g>

      {/* ── Triggers (from e7d xbox-one/trigger.svg) ── */}
      <g transform="translate(200,0)">
        <path d="M49.752 5.475c.401-.319.806-.619 1.212-.9l2.324 110.179L0 122C12.075 4.982 42.991 10.78 49.752 5.475z" fill="#1A1A1A" />
        <path d="M76.799.142C87.64.546 88.876 11.601 89 15.358v1.229s-2.902 40.784 0 93.251c-9.934 2.293-38.567 5.307-38.567 5.307s-.052-20.949-.681-50.682c-.812-37.564 1.212-59.888 1.212-59.888C57.386.091 64.54-.308 76.799.142z" fill="#141414" />
      </g>
      <g transform="translate(460,0) scale(-1,1) translate(-89,0)">
        <path d="M49.752 5.475c.401-.319.806-.619 1.212-.9l2.324 110.179L0 122C12.075 4.982 42.991 10.78 49.752 5.475z" fill="#1A1A1A" />
        <path d="M76.799.142C87.64.546 88.876 11.601 89 15.358v1.229s-2.902 40.784 0 93.251c-9.934 2.293-38.567 5.307-38.567 5.307s-.052-20.949-.681-50.682c-.812-37.564 1.212-59.888 1.212-59.888C57.386.091 64.54-.308 76.799.142z" fill="#141414" />
      </g>

      {/* ── Xbox guide button ── */}
      <circle cx="375" cy="196.412" r="32.5" fill="#282828" stroke="#3a3a3a" strokeWidth="1" />
      <path d="M384.006 182.009s8.935-9.444 13.771-8.876l-.009-.006a36.07 36.07 0 0 0-2.262-2.018.035.035 0 0 1-.021-.012 19.343 19.343 0 0 0-1.184-.909c-.022-.019-.05-.036-.062-.054-.386-.278-.771-.549-1.173-.835l-.004-.003c-.382-.06-.776-.125-1.188-.166-5.25-.494-16.869 4.511-16.869 4.511s-11.62-5.005-16.869-4.511c-.413.041-.81.105-1.188.166l-.003.002c-.407.29-.795.563-1.182.843a.25.25 0 0 1-.056.046c-.407.291-.803.596-1.188.916l-.019.007a36.239 36.239 0 0 0-2.269 2.023v.001c4.836-.567 13.768 8.877 13.768 8.877s-17.73 20.884-16.965 34.084a34.72 34.72 0 0 0 3.618 4.026c-.44-11.992 22.349-30.134 22.349-30.134s22.789 18.14 22.352 30.134a34.063 34.063 0 0 0 3.574-3.98.587.587 0 0 0 .041-.046c.77-13.202-16.962-34.086-16.962-34.086z" fill={isPressed(s, BTN.HOME) ? "#fff" : "rgba(255,255,255,0.25)"} />

      {/* ── Face buttons (ABXY) — positions from e7d CSS ── */}
      {/* A - bottom */}
      <circle cx="566.491" cy="329.498" r="26.5" fill={isPressed(s, BTN.A) ? "#39B54A" : "#0a0a0a"} stroke={isPressed(s, BTN.A) ? "#39B54A" : "#1A1615"} strokeWidth="2" />
      <text x="566.491" y="337" textAnchor="middle" fontSize="22" fill={isPressed(s, BTN.A) ? "#fff" : "#39B54Aaa"} fontWeight="700">A</text>
      {/* B - right */}
      <circle cx="616.493" cy="279.493" r="26.5" fill={isPressed(s, BTN.B) ? "#C1272D" : "#0a0a0a"} stroke={isPressed(s, BTN.B) ? "#C1272D" : "#1A1615"} strokeWidth="2" />
      <text x="616.493" y="287" textAnchor="middle" fontSize="22" fill={isPressed(s, BTN.B) ? "#fff" : "#C1272Daa"} fontWeight="700">B</text>
      {/* X - left */}
      <circle cx="516.486" cy="279.493" r="26.5" fill={isPressed(s, BTN.X) ? "#0071BC" : "#0a0a0a"} stroke={isPressed(s, BTN.X) ? "#0071BC" : "#1A1615"} strokeWidth="2" />
      <text x="516.486" y="287" textAnchor="middle" fontSize="22" fill={isPressed(s, BTN.X) ? "#fff" : "#0071BCaa"} fontWeight="700">X</text>
      {/* Y - top */}
      <circle cx="566.491" cy="228.49" r="26.5" fill={isPressed(s, BTN.Y) ? "#FCEE21" : "#0a0a0a"} stroke={isPressed(s, BTN.Y) ? "#FCEE21" : "#1A1615"} strokeWidth="2" />
      <text x="566.491" y="236" textAnchor="middle" fontSize="22" fill={isPressed(s, BTN.Y) ? "#fff" : "#FCEE21aa"} fontWeight="700">Y</text>

      {/* ── View button (select) ── */}
      <circle cx="306" cy="280.366" r="16" fill={isPressed(s, BTN.SELECT) ? accent : "#0A0A0A"} stroke={isPressed(s, BTN.SELECT) ? accent : "#1a1a1a"} strokeWidth="1" />
      <g fill={isPressed(s, BTN.SELECT) ? "#fff" : "#6D6B6C"} transform="translate(297.5,275.5)">
        <path d="M2.5 0h5.5v1.5H2.5zm0 3.9h5.5v1.5H2.5zm0 3.8h5.5v1.5H2.5z" />
        <path d="M0 .3h3v7.4H0z" /><path d="M0 4.4h8v3H0z" />
      </g>
      {/* ── Menu button (start) ── */}
      <circle cx="414" cy="280.366" r="16" fill={isPressed(s, BTN.START) ? accent : "#0A0A0A"} stroke={isPressed(s, BTN.START) ? accent : "#1a1a1a"} strokeWidth="1" />
      <g fill={isPressed(s, BTN.START) ? "#fff" : "#6D6B6C"} transform="translate(405.5,275)">
        <path d="M0 0h14v1.5H0zm0 3.9h14v1.5H0zm0 3.8h14v1.5H0z" />
      </g>

      {/* ── D-Pad interactive overlay ── */}
      <g transform="translate(277.671,401.487) scale(1.8)">
        {/* cross background */}
        <rect x="-9" y="-27" width="18" height="54" rx="4" fill="none" />
        <rect x="-27" y="-9" width="54" height="18" rx="4" fill="none" />
        {/* Up */}
        <rect x="-8" y="-26" width="16" height="20" rx="2.5" fill={btnFill(isPressed(s, BTN.DPAD_UP), accent)} stroke={btnStroke(isPressed(s, BTN.DPAD_UP), accent)} strokeWidth="0.6" opacity="0.85" />
        {/* Down */}
        <rect x="-8" y="6" width="16" height="20" rx="2.5" fill={btnFill(isPressed(s, BTN.DPAD_DOWN), accent)} stroke={btnStroke(isPressed(s, BTN.DPAD_DOWN), accent)} strokeWidth="0.6" opacity="0.85" />
        {/* Left */}
        <rect x="-26" y="-8" width="20" height="16" rx="2.5" fill={btnFill(isPressed(s, BTN.DPAD_LEFT), accent)} stroke={btnStroke(isPressed(s, BTN.DPAD_LEFT), accent)} strokeWidth="0.6" opacity="0.85" />
        {/* Right */}
        <rect x="6" y="-8" width="20" height="16" rx="2.5" fill={btnFill(isPressed(s, BTN.DPAD_RIGHT), accent)} stroke={btnStroke(isPressed(s, BTN.DPAD_RIGHT), accent)} strokeWidth="0.6" opacity="0.85" />
      </g>

      {/* ── Left bumper (LB) ── */}
      <g opacity={isPressed(s, BTN.LB) ? 1 : 0.15}>
        <path d="M134.221.76C91.974-4.862 38.282 22.221 20.001 32.135c-.274.164-.557.313-.828.464-.083.054-.157.11-.25.164-.183.083-.351.192-.533.303a1.621 1.621 0 0 1-.29.168 8.024 8.024 0 0 1-.452.297c-.084.046-.183.113-.288.182a3.428 3.428 0 0 1-.419.268c-.082.068-.17.137-.269.206-.134.087-.259.171-.397.27-.091.068-.163.137-.251.19a3.393 3.393 0 0 0-.377.29c-.088.061-.173.106-.244.172a5.2 5.2 0 0 1-.362.287c-.067.059-.147.125-.226.191-.116.105-.224.184-.348.288a2.907 2.907 0 0 0-.193.19c-.118.081-.24.189-.341.299a1.08 1.08 0 0 1-.186.154c-.12.112-.214.226-.326.325a1.264 1.264 0 0 0-.167.155c-.095.119-.209.221-.323.328a2.439 2.439 0 0 0-.125.156 3.162 3.162 0 0 0-.325.348.626.626 0 0 1-.107.121 4.513 4.513 0 0 0-.315.37.972.972 0 0 0-.095.104c-.118.144-.219.266-.315.403a5.159 5.159 0 0 1-.068.087c-.119.138-.216.285-.321.442a.304.304 0 0 1-.036.042c-.124.152-.227.328-.333.473.025-.01 97.688-41.961 121.984-34.379 15.54 4.869 27.223 15.331 32.802 18.224l3.423-6.342C156.689 13.781 142.069 1.797 134.221.76z" fill={isPressed(s, BTN.LB) ? accent : "#F2F2F2"} transform="translate(107,129)" />
      </g>
      <text x="168" y="178" textAnchor="middle" fontSize="14" fill={isPressed(s, BTN.LB) ? "#fff" : "rgba(255,255,255,0.35)"} fontWeight="600">LB</text>

      <TriggerMeter x={168} y={84} width={118} label="LT" value={lt} accent={accent} align="center" />

      {/* ── Right bumper (RB) ── */}
      <g opacity={isPressed(s, BTN.RB) ? 1 : 0.15} transform="translate(472,129) scale(-1,1) translate(-171,0)">
        <path d="M134.221.76C91.974-4.862 38.282 22.221 20.001 32.135c-.274.164-.557.313-.828.464-.083.054-.157.11-.25.164-.183.083-.351.192-.533.303a1.621 1.621 0 0 1-.29.168 8.024 8.024 0 0 1-.452.297c-.084.046-.183.113-.288.182a3.428 3.428 0 0 1-.419.268c-.082.068-.17.137-.269.206-.134.087-.259.171-.397.27-.091.068-.163.137-.251.19a3.393 3.393 0 0 0-.377.29c-.088.061-.173.106-.244.172a5.2 5.2 0 0 1-.362.287c-.067.059-.147.125-.226.191-.116.105-.224.184-.348.288a2.907 2.907 0 0 0-.193.19c-.118.081-.24.189-.341.299a1.08 1.08 0 0 1-.186.154c-.12.112-.214.226-.326.325a1.264 1.264 0 0 0-.167.155c-.095.119-.209.221-.323.328a2.439 2.439 0 0 0-.125.156 3.162 3.162 0 0 0-.325.348.626.626 0 0 1-.107.121 4.513 4.513 0 0 0-.315.37.972.972 0 0 0-.095.104c-.118.144-.219.266-.315.403a5.159 5.159 0 0 1-.068.087c-.119.138-.216.285-.321.442a.304.304 0 0 1-.036.042c-.124.152-.227.328-.333.473.025-.01 97.688-41.961 121.984-34.379 15.54 4.869 27.223 15.331 32.802 18.224l3.423-6.342C156.689 13.781 142.069 1.797 134.221.76z" fill={isPressed(s, BTN.RB) ? accent : "#F2F2F2"} />
      </g>
      <text x="580" y="178" textAnchor="middle" fontSize="14" fill={isPressed(s, BTN.RB) ? "#fff" : "rgba(255,255,255,0.35)"} fontWeight="600">RB</text>

      <TriggerMeter x={580} y={84} width={118} label="RT" value={rt} accent={accent} align="center" />

      {/* ── Left stick knob ── */}
      <circle cx={lx} cy={ly} r="39" fill={isPressed(s, BTN.L3) ? accent : "#1a1a1a"} stroke={isPressed(s, BTN.L3) ? accent : "#212121"} strokeWidth="3" className="ct-stick-anim" />
      <circle cx={lx} cy={ly} r="25" fill="none" stroke={isPressed(s, BTN.L3) ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.06)"} strokeWidth="1.5" className="ct-stick-anim" />
      <circle cx={lx} cy={ly} r="7" fill={isPressed(s, BTN.L3) ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.03)"} className="ct-stick-anim" />

      {/* ── Right stick knob ── */}
      <circle cx={rx} cy={ry} r="39" fill={isPressed(s, BTN.R3) ? accent : "#1a1a1a"} stroke={isPressed(s, BTN.R3) ? accent : "#212121"} strokeWidth="3" className="ct-stick-anim" />
      <circle cx={rx} cy={ry} r="25" fill="none" stroke={isPressed(s, BTN.R3) ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.06)"} strokeWidth="1.5" className="ct-stick-anim" />
      <circle cx={rx} cy={ry} r="7" fill={isPressed(s, BTN.R3) ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.03)"} className="ct-stick-anim" />

    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════
   DualShock 4 / DualSense — e7d/gamepad-viewer SVG paths (MIT)
   viewBox matches the original 806 × 630 base (padded for HUD)
   ═══════════════════════════════════════════════════════════════ */

const PlayStationModel = ({ s }) => {
  const stickTravel = 25;
  const lx = 274.65 + getAxis(s, 0) * stickTravel;
  const ly = 355.967 + getAxis(s, 1) * stickTravel;
  const rx = 531.25 + getAxis(s, 2) * stickTravel;
  const ry = 355.967 + getAxis(s, 3) * stickTravel;
  const lt = getButtonValue(s, BTN.LT);
  const rt = getButtonValue(s, BTN.RT);
  const accent = "#006fcd";

  return (
    <svg className="ct-svg" viewBox="0 0 806 630" xmlns="http://www.w3.org/2000/svg">
      {/* ── Base body (from e7d/gamepad-viewer ds4/base-black.svg, MIT) ── */}
      <path fill="#0D0E13" d="M801.25 418.567c-2.899-15.5-17.7-102.5-32-144.6-9.399-27.701-13.1-53-17-64.9-12-35.7-33-65.7-33-65.7s-9.5-13.1-10.1-16.3c-.601-3.3-4.7-8.6-4.7-8.6s-17.4-5.7-62.3-5.7-53.7 5-53.7 5-2.4 2.9-5.9 4.8c-3.5 1.8-11.699 1.7-11.699 1.7h-33.4s-.6-.1-.9.3c-.399.4-.6 2-.6 2h-266.1s-.301-1.7-.601-2c-.399-.4-.899-.3-.899-.3h-33.4s-8.2.2-11.7-1.7c-3.5-1.8-5.899-4.8-5.899-4.8s-8.8-5-53.7-5c-44.8 0-62.3 5.7-62.3 5.7s-4.1 5.3-4.7 8.6c-.6 3.3-10.1 16.3-10.1 16.3s-21 30-33 65.7c-4 11.9-7.7 37.199-17 64.9-14.3 42.1-29.1 129.1-32 144.6-4.3 23.2-4.6 90.2-4.6 90.2s4.5 53.399 36.2 74.899c31.7 21.5 56.7 14 56.7 14s33.1-8.2 57.8-41.899c24.7-33.7 56.6-129.2 56.6-129.2s2.2-3 5.7-5.3c3.5-2.301 6.3-2.601 6.3-2.601l183.7.101 183.7-.101s2.8.3 6.3 2.601c3.5 2.3 5.7 5.3 5.7 5.3s31.899 95.399 56.6 129.2c24.7 33.8 57.8 41.899 57.8 41.899s25 7.5 56.7-14 36.2-74.899 36.2-74.899-.302-66.999-4.702-90.2z" />

      {/* ── Grip shading (left) ── */}
      <path opacity=".1" fill="#E6E6E6" d="M105.15 544.467c-40.5-2.8-75.8-20.3-87.3-30.5-11.5-10.3-17.5-31.6-17.5-31.6-.4 15-.4 26.3-.4 26.3s4.5 53.4 36.2 74.9c31.7 21.5 56.7 14 56.7 14s33.1-8.2 57.8-41.9c4.5-6.2 9.3-14.5 14.1-23.8-.1 0-19.2 15.3-59.6 12.6z" />
      {/* ── Grip shading (right) ── */}
      <path opacity=".1" fill="#E6E6E6" d="M700.75 544.467c40.5-2.8 75.8-20.3 87.3-30.5 11.5-10.199 17.5-31.5 17.5-31.5.4 15 .4 26.301.4 26.301s-4.5 53.399-36.2 74.899-56.7 14-56.7 14-33.1-8.2-57.8-41.899c-4.5-6.2-9.3-14.5-14.1-23.801.1-.1 19.201 15.2 59.6 12.5z" />

      {/* ── Left stick well ── */}
      <path fill="#13161F" d="M351.15 359.967c0-42.199-34.3-76.499-76.5-76.499s-76.5 34.3-76.5 76.499c0 .7 0 1.301.1 2 0 .7-.1 1.301-.1 2 0 42.2 34.3 76.5 76.5 76.5s76.5-34.3 76.5-76.5c0-.699 0-1.3-.101-2 .001-.699.101-1.4.101-2z" />
      <circle fill="#0F1015" cx="274.65" cy="355.967" r="73" />
      <circle cx="274.65" cy="355.967" r="51.5" fill="#0D0E13" />

      {/* ── Right stick well ── */}
      <path fill="#13161F" d="M607.75 359.967c0-42.199-34.3-76.499-76.5-76.499s-76.5 34.3-76.5 76.499c0 .7 0 1.301.101 2 0 .7-.101 1.301-.101 2 0 42.2 34.3 76.5 76.5 76.5s76.5-34.3 76.5-76.5c0-.699 0-1.3-.1-2 .1-.699.1-1.4.1-2z" />
      <circle fill="#0F1015" cx="531.25" cy="355.967" r="73" />
      <circle cx="531.25" cy="355.967" r="51.5" fill="#0D0E13" />

      {/* ── Touchpad ── */}
      <path fill="#121212" d="M534.75 127.967c-.399-3.2-3.3-5.6-6.5-5.6h-250.6c-3.2 0-6.101 2.3-6.5 5.6-.101.7-.101 1.4-.101 2.1v127.4c0 8.899 7.2 16.1 16.101 16.1h231.6c8.9 0 16.101-7.2 16.101-16.1v-127.4c.099-.7 0-1.4-.101-2.1z" />
      <path fill="#080808" d="M530.351 124.267c0-1-.801-1.9-1.9-1.9h-251.1c-1 0-1.9.8-1.9 1.9v129.201c0 8.6 7 15.6 15.6 15.6h223.8c8.6 0 15.6-7 15.6-15.6V130.367l-.1-6.1z" />

      {/* ── Face button / D-Pad background circles ── */}
      <circle fill="#080808" cx="652.25" cy="244.767" r="94.3" />
      <circle fill="#080808" cx="153.65" cy="244.767" r="94.3" />

      {/* ── D-Pad arrow indicators (from base) ── */}
      <path fill="#1F1F1F" d="M230.351 254.067l9.5-8.9c.5-.5.5-1.199 0-1.699l-9.5-8.9c-.7-.7-1.9-.2-1.9.8v17.799c-.1 1 1.099 1.5 1.9.9zm-85.401-84.3h17.8c1 0 1.5-1.2.8-1.9l-8.9-9.5c-.5-.5-1.2-.5-1.7 0l-8.9 9.5c-.6.7-.1 1.9.9 1.9zm-67.5 64.8l-9.5 8.9c-.5.5-.5 1.199 0 1.699l9.5 8.9c.7.699 1.9.199 1.9-.801v-17.798c0-1.1-1.2-1.6-1.9-.9zm85.3 84.201h-17.8c-1 0-1.5 1.199-.8 1.899l8.9 9.5c.5.5 1.2.5 1.7 0l8.9-9.5c.6-.7.1-1.899-.9-1.899z" />

      {/* ── Create / Options button wells ── */}
      <path d="M240.45 143.467c6.9 0 12.5 5.6 12.5 12.5v18.3c0 6.9-5.6 12.5-12.5 12.5s-12.5-5.6-12.5-12.5v-18.3c0-6.9 5.6-12.5 12.5-12.5" fill="#10111A" />
      <path d="M565.45 143.467c6.9 0 12.5 5.6 12.5 12.5v18.3c0 6.9-5.6 12.5-12.5 12.5s-12.5-5.6-12.5-12.5v-18.3c0-6.9 5.6-12.5 12.5-12.5" fill="#10111A" />

      {/* ── Speaker grille dots ── */}
      <g>
        <circle cx="402.95" cy="316.367" r="4.1" fill="#0D0E13" />
        <circle cx="402.95" cy="295.467" r="4.1" fill="#0D0E13" />
        <circle cx="396.05" cy="305.667" r="4.1" fill="#0D0E13" />
        <circle cx="381.351" cy="305.667" r="4.1" fill="#0D0E13" />
        <circle cx="388.65" cy="316.367" r="4.1" fill="#0D0E13" />
        <circle cx="388.65" cy="295.467" r="4.1" fill="#0D0E13" />
        <circle cx="374.351" cy="295.467" r="4.1" fill="#0D0E13" />
        <circle cx="409.851" cy="305.667" r="4.1" fill="#0D0E13" />
        <circle cx="424.55" cy="305.667" r="4.1" fill="#0D0E13" />
        <circle cx="417.15" cy="316.367" r="4.1" fill="#0D0E13" />
        <circle cx="417.15" cy="295.467" r="4.1" fill="#0D0E13" />
        <circle cx="431.55" cy="295.467" r="4.1" fill="#0D0E13" />
      </g>

      {/* ── Light bar ── */}
      <path fill="#0B0B0F" d="M436.55 420.967h-67.9c-2.8 0-4.601.601-4.601-2.199 0-2.801 2.301-5 5-5h67.9c2.8 0 5 2.3 5 5 .101 2.699-2.598 2.199-5.399 2.199z" />

      {/* ── Trigger areas (from base) ── */}
      <path fill="#0A0A0A" d="M697.15 109.867c0-.8-.4-1.5-1.101-1.9-4.5-2.9-23.399-13.6-51.5-13.6-26.899 0-41.1 5.9-45.1 8-.8.4-1.2 1.2-1.2 2 0 0 9.8-2.9 47.5-2.9s51.401 8.4 51.401 8.4z" />
      <path fill="#121212" d="M697.05 116.767v-6.9s-13.699-8.4-51.399-8.4c-37.8 0-47.5 2.9-47.5 2.9v11c7.7-1.3 21.2-2.6 44.1-2.6 28.499.1 45.899 2.4 54.799 4z" />
      <path fill="#0A0A0A" d="M108.75 109.867c0-.8.4-1.5 1.1-1.9 4.5-2.9 23.4-13.6 51.5-13.6 26.9 0 41.1 5.9 45.1 8 .8.4 1.2 1.2 1.2 2 0 0-9.8-2.9-47.5-2.9s-51.4 8.4-51.4 8.4z" />
      <path fill="#121212" d="M108.85 116.767v-6.9s13.7-8.4 51.4-8.4c37.8 0 47.5 2.9 47.5 2.9v11c-7.7-1.3-21.2-2.6-44.1-2.6-28.5.1-45.9 2.4-54.8 4z" />

      {/* ── Trigger 3D shapes (from base) ── */}
      <path fill="#121212" d="M108.85 116.767v-6.9s13.7-8.4 51.4-8.4c37.8 0 47.5 2.9 47.5 2.9v11c-7.7-1.3-21.2-2.6-44.1-2.6-28.5.1-45.9 2.4-54.8 4zm588.3-26s-32.7-3.2-50.601-3.2c-17.899 0-48.399 2.4-48.399 2.4s3.1-44.7 4.8-52c1.6-7.3 7.7-21.3 16.9-27.9 9.199-6.6 11.899-10.1 22.699-10.1 10.801 0 25.4 6.4 34.601 21.4 9.3 15 20 69.4 20 69.4z" />
      <path fill="#121212" d="M108.75 90.767s32.7-3.2 50.6-3.2 48.3 2.4 48.3 2.4-3.1-44.7-4.8-52c-1.6-7.3-7.7-21.3-16.9-27.9-9.1-6.7-11.8-10.1-22.6-10.1s-25.4 6.4-34.6 21.4c-9.2 15-20 69.4-20 69.4z" />

      {/* ── PS button (from base) ── */}
      <circle fill="#050505" stroke="#000" strokeWidth="2" strokeMiterlimit="10" cx="402.95" cy="361.967" r="20.2" />
      <g fill={isPressed(s, BTN.HOME) ? "#fff" : "#F2F2F2"} opacity={isPressed(s, BTN.HOME) ? 1 : 0.4}>
        <path d="M404.05 368.567v-12.8c0-.5.101-.801.301-1 .1-.2.399-.301.699-.2.601.2.9.7.9 1.7v6.899c.8.4 1.5.5 2.1.5.601 0 1.2-.2 1.601-.5 1-.7 1.5-1.899 1.5-3.7 0-1.899-.4-3.399-1.2-4.3-.8-1-2.1-1.899-4.1-2.6-1.301-.4-2.5-.8-3.601-1.101-1.1-.3-2-.5-2.899-.699v20.599l4.699 1.5v-4.298zm-5.1-1l-1.7.6-.899.4-1.601.3-1.5-.2c-.3-.2-.399-.399-.2-.6.101-.101.2-.101.301-.2.1-.1.3-.1.399-.2l1.101-.399 4.1-1.5v-2.7l-1.7.5-5.5 2-1 .399c-1.5.601-2.2 1.2-2.2 1.801.101.8 1 1.5 2.7 1.899.7.2 1.4.3 2.101.4.699.1 1.399.1 2.199.1 1 0 2.101-.1 3.301-.3v-2.3h.098z" />
        <path d="M414.75 365.268c-.899-.301-1.7-.5-2.5-.601-.8-.1-1.7-.2-2.5-.1-.899 0-1.899.2-2.8.3-.8.2-1.7.4-2.6.8v2.8l3.899-1.399 1.601-.5 1.1-.3h1.4c.3.1.6.199.699.399 0 .2-.199.4-.8.601l-1.399.5-6.5 2.399v2.7l3.5-1.3 6.399-2.3.7-.4c1.5-.5 2.2-1.2 2.2-1.9.001-.6-.798-1.199-2.399-1.699z" />
      </g>
      {isPressed(s, BTN.HOME) && <circle cx="402.95" cy="361.967" r="20.2" fill={accent} opacity="0.25" />}

      {/* ═══ Interactive overlays ═══ */}

      {/* ── D-Pad arrows (from e7d ds4/dpad.svg, each path individually positioned via svgpathtools bbox) ── */}
      {/* Up — path center (17.71,25.50) → target (154,207) */}
      <path transform="translate(136.29,181.50)"
        d="M20.605 1.254c-2-1.4-2.9-1.2-2.9-1.2s-.9-.2-2.9 1.2-13.6 15-14 15.7c-.4.7-2.2 28.5 1.3 31.399 3.5 2.9 15.6 2.601 15.6 2.601s12.1.3 15.6-2.601c3.5-2.899 1.7-30.699 1.3-31.399s-12-14.3-14-15.7z"
        fill={isPressed(s, BTN.DPAD_UP) ? accent : "#1A1A1A"} opacity={isPressed(s, BTN.DPAD_UP) ? 1 : 0.8} />
      {/* Down — path center (55.10,25.50) → target (154,281) */}
      <path transform="translate(98.90,255.50)"
        d="M52.205 49.754c2 1.4 2.9 1.2 2.9 1.2s.9.2 2.9-1.2 13.6-15 14-15.7 2.2-28.5-1.3-31.399c-3.5-2.9-15.6-2.601-15.6-2.601s-12.1-.2-15.6 2.601c-3.5 2.8-1.7 30.699-1.3 31.399.4.7 12 14.3 14 15.7z"
        fill={isPressed(s, BTN.DPAD_DOWN) ? accent : "#1A1A1A"} opacity={isPressed(s, BTN.DPAD_DOWN) ? 1 : 0.8} />
      {/* Left — path center (153.05,17.85) → target (118,243) */}
      <path transform="translate(-35.05,225.15)"
        d="M175.904 2.254c-2.899-3.5-30.699-1.7-31.399-1.3-.7.399-14.3 12-15.7 14s-1.199 2.899-1.199 2.899-.201.9 1.199 2.9 15 13.6 15.7 14 28.5 2.2 31.399-1.3c2.9-3.5 2.601-15.601 2.601-15.601s.3-12.098-2.601-15.598z"
        fill={isPressed(s, BTN.DPAD_LEFT) ? accent : "#1A1A1A"} opacity={isPressed(s, BTN.DPAD_LEFT) ? 1 : 0.8} />
      {/* Right — path center (100.26,17.76) → target (191,243) */}
      <path transform="translate(90.74,225.24)"
        d="M124.505 20.654c1.399-2 1.2-2.9 1.2-2.9s.199-.9-1.2-2.9-15-13.6-15.7-14c-.699-.399-28.5-2.199-31.4 1.301s-2.6 15.6-2.6 15.6-.3 12.1 2.6 15.6 30.701 1.7 31.4 1.301c.7-.402 14.3-12.002 15.7-14.002z"
        fill={isPressed(s, BTN.DPAD_RIGHT) ? accent : "#1A1A1A"} opacity={isPressed(s, BTN.DPAD_RIGHT) ? 1 : 0.8} />

      {/* ── Face buttons (PlayStation symbols — e7d ds4/buttons.svg paths, scaled to 70% of r=26 circle) ── */}
      {/* Cross (A) - bottom */}
      <circle cx="652.25" cy="300.767" r="26" fill={isPressed(s, BTN.A) ? "#7FB1DF" : "#0a0a0a"} stroke={isPressed(s, BTN.A) ? "#7FB1DF" : "#1A1615"} strokeWidth="2" />
      <g transform="translate(652.25,300.767) scale(1.236) translate(-27.95,-27.95)">
        <path d="M42.667 15.282l-2.052-2.052L28 25.846 15.282 13.23l-2.052 2.052 12.616 12.615L13.23 40.616l2.052 2.052L28 30.05l12.615 12.618 2.052-2.052-12.616-12.719z"
          fill={isPressed(s, BTN.A) ? "#fff" : "#7FB1DF"} opacity={isPressed(s, BTN.A) ? 1 : 0.7} />
      </g>
      {/* Circle (B) - right */}
      <circle cx="708.25" cy="244.767" r="26" fill={isPressed(s, BTN.B) ? "#F16667" : "#0a0a0a"} stroke={isPressed(s, BTN.B) ? "#F16667" : "#1A1615"} strokeWidth="2" />
      <g transform="translate(708.25,244.767) scale(0.937) translate(-84.05,-28.00)">
        <path fillRule="evenodd" d="M84.051 8.615c-10.686 0-19.42 8.718-19.42 19.384 0 10.667 8.734 19.386 19.42 19.386 10.687 0 19.42-8.718 19.42-19.386-.102-10.77-8.733-19.384-19.42-19.384zm0 35.795c-9.145 0-16.44-7.384-16.44-16.411 0-9.128 7.397-16.41 16.44-16.41 9.042 0 16.439 7.386 16.439 16.41.002 9.026-7.396 16.411-16.439 16.411z"
          fill={isPressed(s, BTN.B) ? "#fff" : "#F16667"} opacity={isPressed(s, BTN.B) ? 1 : 0.7} />
      </g>
      {/* Square (X) - left */}
      <circle cx="596.25" cy="244.767" r="26" fill={isPressed(s, BTN.X) ? "#CB79B1" : "#0a0a0a"} stroke={isPressed(s, BTN.X) ? "#CB79B1" : "#1A1615"} strokeWidth="2" />
      <g transform="translate(596.25,244.767) scale(1.239) translate(-140.00,-27.85)">
        <path fillRule="evenodd" d="M151.795 13.153h-26.462v29.385h29.334V13.154l-2.872-.001zm0 26.612h-23.59V16.132h23.59v23.633z"
          fill={isPressed(s, BTN.X) ? "#fff" : "#CB79B1"} opacity={isPressed(s, BTN.X) ? 1 : 0.7} />
      </g>
      {/* Triangle (Y) - top */}
      <circle cx="652.25" cy="188.767" r="26" fill={isPressed(s, BTN.Y) ? "#66C194" : "#0a0a0a"} stroke={isPressed(s, BTN.Y) ? "#66C194" : "#1A1615"} strokeWidth="2" />
      <g transform="translate(652.25,188.767) scale(1.006) translate(-196.00,-23.12)">
        <path fillRule="evenodd" d="M212.44 35.834l-16.439-28.307-16.439 28.307-1.646 2.872h36.168l-1.644-2.872zm-16.336 0h-13.051l13.051-22.462 13.049 22.462h-13.049z"
          fill={isPressed(s, BTN.Y) ? "#fff" : "#66C194"} opacity={isPressed(s, BTN.Y) ? 1 : 0.7} />
      </g>

      {/* ── Create button ── */}
      <path d="M240.45 143.467c6.9 0 12.5 5.6 12.5 12.5v18.3c0 6.9-5.6 12.5-12.5 12.5s-12.5-5.6-12.5-12.5v-18.3c0-6.9 5.6-12.5 12.5-12.5z"
        fill={isPressed(s, BTN.SELECT) ? accent : "transparent"} opacity={isPressed(s, BTN.SELECT) ? 0.5 : 0} />
      <text x="240" y="162" textAnchor="middle" fontSize="10" fill={isPressed(s, BTN.SELECT) ? "#fff" : "rgba(255,255,255,0.25)"} fontWeight="600">CRE</text>

      {/* ── Options button ── */}
      <path d="M565.45 143.467c6.9 0 12.5 5.6 12.5 12.5v18.3c0 6.9-5.6 12.5-12.5 12.5s-12.5-5.6-12.5-12.5v-18.3c0-6.9 5.6-12.5 12.5-12.5z"
        fill={isPressed(s, BTN.START) ? accent : "transparent"} opacity={isPressed(s, BTN.START) ? 0.5 : 0} />
      <text x="565" y="162" textAnchor="middle" fontSize="10" fill={isPressed(s, BTN.START) ? "#fff" : "rgba(255,255,255,0.25)"} fontWeight="600">OPT</text>

      {/* ── L1 bumper ── */}
      <g opacity={isPressed(s, BTN.LB) ? 1 : 0.15}>
        <path d="M108.85 116.767v-6.9s13.7-8.4 51.4-8.4c37.8 0 47.5 2.9 47.5 2.9" stroke={isPressed(s, BTN.LB) ? accent : "#F5F5F5"} strokeWidth="4" fill="none" />
      </g>
      <text x="145" y="130" textAnchor="middle" fontSize="14" fill={isPressed(s, BTN.LB) ? "#fff" : "rgba(255,255,255,0.35)"} fontWeight="600">L1</text>

      <TriggerMeter x={158} y={88} width={108} label="L2" value={lt} accent={accent} align="center" />

      {/* ── R1 bumper ── */}
      <g opacity={isPressed(s, BTN.RB) ? 1 : 0.15}>
        <path d="M697.05 116.767v-6.9s-13.699-8.4-51.399-8.4c-37.8 0-47.5 2.9-47.5 2.9" stroke={isPressed(s, BTN.RB) ? accent : "#F5F5F5"} strokeWidth="4" fill="none" />
      </g>
      <text x="660" y="130" textAnchor="middle" fontSize="14" fill={isPressed(s, BTN.RB) ? "#fff" : "rgba(255,255,255,0.35)"} fontWeight="600">R1</text>

      <TriggerMeter x={648} y={88} width={108} label="R2" value={rt} accent={accent} align="center" />

      {/* ── Left stick knob ── */}
      <circle cx={lx} cy={ly} r="36" fill={isPressed(s, BTN.L3) ? accent : "#18181f"} stroke={isPressed(s, BTN.L3) ? accent : "#222230"} strokeWidth="3" className="ct-stick-anim" />
      <circle cx={lx} cy={ly} r="24" fill="none" stroke={isPressed(s, BTN.L3) ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.05)"} strokeWidth="1.5" className="ct-stick-anim" />
      <circle cx={lx} cy={ly} r="10" fill="none" stroke={isPressed(s, BTN.L3) ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.03)"} strokeWidth="1" className="ct-stick-anim" />

      {/* ── Right stick knob ── */}
      <circle cx={rx} cy={ry} r="36" fill={isPressed(s, BTN.R3) ? accent : "#18181f"} stroke={isPressed(s, BTN.R3) ? accent : "#222230"} strokeWidth="3" className="ct-stick-anim" />
      <circle cx={rx} cy={ry} r="24" fill="none" stroke={isPressed(s, BTN.R3) ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.05)"} strokeWidth="1.5" className="ct-stick-anim" />
      <circle cx={rx} cy={ry} r="10" fill="none" stroke={isPressed(s, BTN.R3) ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.03)"} strokeWidth="1" className="ct-stick-anim" />

    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Nintendo Pro Controller — hand-crafted (no e7d template)
   ═══════════════════════════════════════════════════════════════ */

const NintendoModel = ({ s }) => {
  const stickR = 12;
  const lx = 152 + getAxis(s, 0) * stickR;
  const ly = 158 + getAxis(s, 1) * stickR;
  const rx = 370 + getAxis(s, 2) * stickR;
  const ry = 215 + getAxis(s, 3) * stickR;
  const lt = getButtonValue(s, BTN.LT);
  const rt = getButtonValue(s, BTN.RT);

  return (
    <svg className="ct-svg" viewBox="0 0 520 420" xmlns="http://www.w3.org/2000/svg">
      {/* ── Body shadow ── */}
      <path d={`M 128,58 C 100,58 80,72 68,92 L 42,158
        C 30,192 22,228 20,258 C 14,318 25,362 52,382
        C 70,396 92,392 108,376 C 124,358 134,334 146,306
        L 164,262 C 172,244 184,230 198,224 L 260,210
        L 322,224 C 336,230 348,244 356,262 L 374,306
        C 386,334 396,358 412,376 C 428,392 450,396 468,382
        C 495,362 506,318 500,258 C 498,228 490,192 478,158
        L 452,92 C 440,72 420,58 392,58 Z`}
        fill="#08080e" />

      {/* ── Main body (dark charcoal like real Pro Controller) ── */}
      <path d={`M 128,54 C 100,54 80,68 68,88 L 42,154
        C 30,188 22,224 20,254 C 14,314 25,358 52,378
        C 70,392 92,388 108,372 C 124,354 134,330 146,302
        L 164,258 C 172,240 184,226 198,220 L 260,206
        L 322,220 C 336,226 348,240 356,258 L 374,302
        C 386,330 396,354 412,372 C 428,388 450,392 468,378
        C 495,358 506,314 500,254 C 498,224 490,188 478,154
        L 452,88 C 440,68 420,54 392,54 Z`}
        fill="#2d2d2d" stroke="#3d3d3d" strokeWidth="1.5" />

      {/* ── Left grip ── */}
      <path d={`M 68,88 L 42,154 C 30,188 22,224 20,254
        C 14,314 25,358 52,378 C 62,386 74,390 85,386
        C 65,368 58,328 60,278 C 62,238 70,198 84,162
        L 102,108 C 108,92 118,78 132,68 L 136,58
        C 125,54 118,55 108,60 Z`}
        fill="#1a1a1a" opacity="0.6" />

      {/* ── Right grip ── */}
      <path d={`M 452,88 L 478,154 C 490,188 498,224 500,254
        C 506,314 495,358 468,378 C 458,386 446,390 435,386
        C 455,368 462,328 460,278 C 458,238 450,198 436,162
        L 418,108 C 412,92 402,78 388,68 L 384,58
        C 395,54 402,55 412,60 Z`}
        fill="#1a1a1a" opacity="0.6" />

      {/* ── Face plate highlight ── */}
      <ellipse cx="260" cy="175" rx="130" ry="95" fill="#323232" opacity="0.3" />

      {/* ── Left bumper (L) ── */}
      <path d={`M 125,60 C 112,60 102,62 94,68 L 80,78 C 76,82 74,88 78,92
        L 120,84 C 130,80 144,76 160,74 L 164,62 C 148,58 136,58 125,60 Z`}
        fill={btnFill(isPressed(s, BTN.LB), "#e60012")}
        stroke={btnStroke(isPressed(s, BTN.LB), "#e60012")} strokeWidth="1.2" />
      <text x="118" y="78" textAnchor="middle" fontSize="8" fill={isPressed(s, BTN.LB) ? "#fff" : "rgba(255,255,255,0.4)"} fontWeight="600">L</text>

      {/* ── Right bumper (R) ── */}
      <path d={`M 395,60 C 408,60 418,62 426,68 L 440,78 C 444,82 446,88 442,92
        L 400,84 C 390,80 376,76 360,74 L 356,62 C 372,58 384,58 395,60 Z`}
        fill={btnFill(isPressed(s, BTN.RB), "#e60012")}
        stroke={btnStroke(isPressed(s, BTN.RB), "#e60012")} strokeWidth="1.2" />
      <text x="402" y="78" textAnchor="middle" fontSize="8" fill={isPressed(s, BTN.RB) ? "#fff" : "rgba(255,255,255,0.4)"} fontWeight="600">R</text>

      {/* ── Left trigger (ZL) ── */}
      <TriggerMeter x={132.5} y={20} width={55} label="ZL" value={lt} accent="#e60012" align="center" />

      {/* ── Right trigger (ZR) ── */}
      <TriggerMeter x={387.5} y={20} width={55} label="ZR" value={rt} accent="#e60012" align="center" />

      {/* ── Left stick well ── */}
      <circle cx="152" cy="158" r="32" fill="#141414" stroke="#222" strokeWidth="1" />
      <circle cx="152" cy="158" r="28" fill="#1a1a1a" />
      <line x1="152" y1="133" x2="152" y2="183" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      <line x1="127" y1="158" x2="177" y2="158" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      {/* Left stick knob */}
      <circle cx={lx} cy={ly} r="21" fill={isPressed(s, BTN.L3) ? "#e60012" : "#333"} stroke={isPressed(s, BTN.L3) ? "#e60012" : "#444"} strokeWidth="1.5" className="ct-stick-anim" />
      <circle cx={lx} cy={ly} r="15" fill="none" stroke={isPressed(s, BTN.L3) ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"} strokeWidth="1" className="ct-stick-anim" />

      {/* ── Right stick well ── */}
      <circle cx="370" cy="215" r="32" fill="#141414" stroke="#222" strokeWidth="1" />
      <circle cx="370" cy="215" r="28" fill="#1a1a1a" />
      <line x1="370" y1="190" x2="370" y2="240" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      <line x1="345" y1="215" x2="395" y2="215" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      {/* Right stick knob */}
      <circle cx={rx} cy={ry} r="21" fill={isPressed(s, BTN.R3) ? "#e60012" : "#333"} stroke={isPressed(s, BTN.R3) ? "#e60012" : "#444"} strokeWidth="1.5" className="ct-stick-anim" />
      <circle cx={rx} cy={ry} r="15" fill="none" stroke={isPressed(s, BTN.R3) ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"} strokeWidth="1" className="ct-stick-anim" />

      {/* ── D-Pad (cross style) ── */}
      <g transform="translate(152,258)">
        <rect x="-9" y="-27" width="18" height="54" rx="3" fill="#1e1e1e" stroke="#2e2e2e" strokeWidth="0.8" />
        <rect x="-27" y="-9" width="54" height="18" rx="3" fill="#1e1e1e" stroke="#2e2e2e" strokeWidth="0.8" />
        <rect x="-8" y="-26" width="16" height="17" rx="2" fill={btnFill(isPressed(s, BTN.DPAD_UP), "#e60012")} stroke={btnStroke(isPressed(s, BTN.DPAD_UP), "#e60012")} strokeWidth="0.8" />
        <rect x="-8" y="9" width="16" height="17" rx="2" fill={btnFill(isPressed(s, BTN.DPAD_DOWN), "#e60012")} stroke={btnStroke(isPressed(s, BTN.DPAD_DOWN), "#e60012")} strokeWidth="0.8" />
        <rect x="-26" y="-8" width="17" height="16" rx="2" fill={btnFill(isPressed(s, BTN.DPAD_LEFT), "#e60012")} stroke={btnStroke(isPressed(s, BTN.DPAD_LEFT), "#e60012")} strokeWidth="0.8" />
        <rect x="9" y="-8" width="17" height="16" rx="2" fill={btnFill(isPressed(s, BTN.DPAD_RIGHT), "#e60012")} stroke={btnStroke(isPressed(s, BTN.DPAD_RIGHT), "#e60012")} strokeWidth="0.8" />
        <circle cx="0" cy="0" r="3.5" fill="#161616" />
      </g>

      {/* ── Face buttons (ABXY Nintendo layout) ── */}
      <g transform="translate(390,135)">
        {/* X - top */}
        <circle cx="0" cy="-28" r="14" fill={btnFill(isPressed(s, BTN.Y), "#e60012")} stroke={btnStroke(isPressed(s, BTN.Y), "#e60012")} strokeWidth="1.8" />
        <text x="0" y="-24" textAnchor="middle" fontSize="12" fill={txtFill(isPressed(s, BTN.Y), "#e60012")} fontWeight="700">X</text>
        {/* B - bottom */}
        <circle cx="0" cy="28" r="14" fill={btnFill(isPressed(s, BTN.A), "#e60012")} stroke={btnStroke(isPressed(s, BTN.A), "#e60012")} strokeWidth="1.8" />
        <text x="0" y="32" textAnchor="middle" fontSize="12" fill={txtFill(isPressed(s, BTN.A), "#e60012")} fontWeight="700">B</text>
        {/* Y - left */}
        <circle cx="-28" cy="0" r="14" fill={btnFill(isPressed(s, BTN.X), "#e60012")} stroke={btnStroke(isPressed(s, BTN.X), "#e60012")} strokeWidth="1.8" />
        <text x="-28" y="4" textAnchor="middle" fontSize="12" fill={txtFill(isPressed(s, BTN.X), "#e60012")} fontWeight="700">Y</text>
        {/* A - right */}
        <circle cx="28" cy="0" r="14" fill={btnFill(isPressed(s, BTN.B), "#e60012")} stroke={btnStroke(isPressed(s, BTN.B), "#e60012")} strokeWidth="1.8" />
        <text x="28" y="4" textAnchor="middle" fontSize="12" fill={txtFill(isPressed(s, BTN.B), "#e60012")} fontWeight="700">A</text>
      </g>

      {/* ── Minus button ── */}
      <circle cx="220" cy="118" r="11"
        fill={btnFill(isPressed(s, BTN.SELECT), "#e60012")} stroke={btnStroke(isPressed(s, BTN.SELECT), "#e60012")} strokeWidth="0.8" />
      <text x="220" y="121" textAnchor="middle" fontSize="12" fill={isPressed(s, BTN.SELECT) ? "#fff" : "rgba(255,255,255,0.3)"}>−</text>

      {/* ── Plus button ── */}
      <circle cx="300" cy="118" r="11"
        fill={btnFill(isPressed(s, BTN.START), "#e60012")} stroke={btnStroke(isPressed(s, BTN.START), "#e60012")} strokeWidth="0.8" />
      <text x="300" y="122" textAnchor="middle" fontSize="12" fill={isPressed(s, BTN.START) ? "#fff" : "rgba(255,255,255,0.3)"}>+</text>

      {/* ── Home button ── */}
      <circle cx="330" cy="165" r="12"
        fill={btnFill(isPressed(s, BTN.HOME), "#e60012")} stroke={btnStroke(isPressed(s, BTN.HOME), "#e60012")} strokeWidth="1" />
      <circle cx="330" cy="165" r="5" fill="none" stroke={isPressed(s, BTN.HOME) ? "#fff" : "rgba(255,255,255,0.2)"} strokeWidth="1.2" />

      {/* ── Capture button (square) ── */}
      <rect x="189" y="157" width="16" height="16" rx="3"
        fill="#262626" stroke="#3a3a3a" strokeWidth="0.8" />

    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════ */

const MODEL_MAP = {
  xbox: XboxModel,
  playstation: PlayStationModel,
  nintendo: NintendoModel,
};

export const ControllerTesterFocusId = "ControllerTester";

const ControllerTester = ({ onClose, controllerIndex, controllerFamily }) => {
  const { t } = useTranslation();
  const [gamepadState, setGamepadState] = useState(null);
  const rafRef = useRef(null);

  const ModelComponent = useMemo(
    () => MODEL_MAP[controllerFamily] || XboxModel,
    [controllerFamily],
  );

  useScopedInput(
    (event) => {
      if (event.name === "B") {
        onClose();
        event.isConsumed = true;
      }
    },
    ControllerTesterFocusId,
  );

  useEffect(() => {
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const gamepads = await api.pollGamepadsSdl();
        if (!active) return;
        const gp = gamepads.find((g) => g.index === controllerIndex) ?? gamepads[0] ?? null;
        setGamepadState(gp);
      } catch {
        // SDL not available — skip
      }
      if (active) {
        rafRef.current = requestAnimationFrame(poll);
      }
    };

    rafRef.current = requestAnimationFrame(poll);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [controllerIndex]);

  const legendItems = useMemo(
    () => [{ button: "B", label: t("Close"), onClick: onClose }],
    [onClose, t],
  );

  const s = gamepadState;

  return (
    <DialogLayout
      title={t("Controller Test")}
      legendItems={legendItems}
      maxWidth="700px"
    >
      {!s ? (
        <div className="ct-no-data">{t("Waiting for controller input...")}</div>
      ) : (
        <div className="ct-layout">
          <ModelComponent s={s} />
        </div>
      )}
    </DialogLayout>
  );
};

export default ControllerTester;
