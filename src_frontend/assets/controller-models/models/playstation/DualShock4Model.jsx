import TriggerMeter from "../../shared/TriggerMeter.jsx";
import { BTN, getAxis, getButtonValue, isPressed } from "../../shared/utils.js";

const DualShock4Model = ({ s }) => {
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


export default DualShock4Model;
