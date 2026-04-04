import switchProSvg from "./vendor/switch-pro-controller.svg";
import TriggerMeter from "../../shared/TriggerMeter.jsx";
import {
  BTN,
  getAxis,
  getButtonValue,
  isPressed,
} from "../../shared/utils.js";

// Keep this model asset-based using the Ryujinx ProCon SVG; do not hand-draw the body again.
const SwitchProModel = ({ s }) => {
  const accent = "#e60012";
  const stickTravel = 14;
  const lx = 213.37 + getAxis(s, 0) * stickTravel;
  const ly = 206.39 + getAxis(s, 1) * stickTravel;
  const rx = 623.77 + getAxis(s, 2) * stickTravel;
  const ry = 345.09 + getAxis(s, 3) * stickTravel;
  const lt = getButtonValue(s, BTN.LT);
  const rt = getButtonValue(s, BTN.RT);

  return (
    <div className="ct-model-wrap">
      <img className="ct-model-base" src={switchProSvg} alt="Nintendo Switch Pro controller" />
      <svg className="ct-model-overlay" viewBox="0 0 996.25 690.92" xmlns="http://www.w3.org/2000/svg">
        <TriggerMeter x={170} y={36} width={170} label="ZL" value={lt} accent={accent} align="center" />
        <TriggerMeter x={826} y={36} width={170} label="ZR" value={rt} accent={accent} align="center" />

        <path d="m649.47,19.99c10.1-4.3,39.7-22.5,58.7-19.7,59.5.9,166.7,17.7,172.6,81.2" stroke={isPressed(s, BTN.RB) ? accent : "transparent"} strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="m115.57,81.49C121.47,18.09,228.57,1.29,288.17.29c19-2.8,48.6,15.4,58.7,19.7" stroke={isPressed(s, BTN.LB) ? accent : "transparent"} strokeWidth="10" fill="none" strokeLinecap="round" />

        <rect x="354" y="281" width="31" height="39" rx="4" fill={isPressed(s, BTN.DPAD_UP) ? accent : "transparent"} />
        <rect x="354" y="370" width="31" height="40" rx="4" fill={isPressed(s, BTN.DPAD_DOWN) ? accent : "transparent"} />
        <rect x="309" y="325" width="40" height="31" rx="4" fill={isPressed(s, BTN.DPAD_LEFT) ? accent : "transparent"} />
        <rect x="399" y="325" width="40" height="31" rx="4" fill={isPressed(s, BTN.DPAD_RIGHT) ? accent : "transparent"} />

        <circle cx="767.07" cy="136.39" r="35" fill={isPressed(s, BTN.Y) ? accent : "transparent"} />
        <circle cx="767.07" cy="276.39" r="35" fill={isPressed(s, BTN.A) ? accent : "transparent"} />
        <circle cx="697.07" cy="206.39" r="35" fill={isPressed(s, BTN.X) ? accent : "transparent"} />
        <circle cx="837.07" cy="206.39" r="35" fill={isPressed(s, BTN.B) ? accent : "transparent"} />
        <text x="767.07" y="146" textAnchor="middle" fontSize="30" fontWeight="700" fill={isPressed(s, BTN.Y) ? "#fff" : "#9fa09e"}>X</text>
        <text x="767.07" y="286" textAnchor="middle" fontSize="30" fontWeight="700" fill={isPressed(s, BTN.A) ? "#fff" : "#9fa09e"}>B</text>
        <text x="697.07" y="216" textAnchor="middle" fontSize="30" fontWeight="700" fill={isPressed(s, BTN.X) ? "#fff" : "#9fa09e"}>Y</text>
        <text x="837.07" y="216" textAnchor="middle" fontSize="30" fontWeight="700" fill={isPressed(s, BTN.B) ? "#fff" : "#9fa09e"}>A</text>

        <circle cx="374.17" cy="130.89" r="22.5" fill={isPressed(s, BTN.SELECT) ? accent : "transparent"} />
        <circle cx="623.57" cy="131.19" r="22.5" fill={isPressed(s, BTN.START) ? accent : "transparent"} />
        <circle cx="578.57" cy="206.39" r="22.5" fill={isPressed(s, BTN.HOME) ? accent : "transparent"} />

        {/* Redraw stick wells to mask static sticks from the base asset. */}
        <circle cx="213.37" cy="206.39" r="55" fill="#20221f" />
        <circle cx="623.77" cy="345.09" r="55" fill="#20221f" />

        <circle cx={lx} cy={ly} r="45" fill="#444542" stroke={isPressed(s, BTN.L3) ? accent : "#ffffff"} strokeWidth="2" className="ct-stick-anim" />
        <circle cx={rx} cy={ry} r="45" fill="#444542" stroke={isPressed(s, BTN.R3) ? accent : "#ffffff"} strokeWidth="2" className="ct-stick-anim" />
      </svg>
    </div>
  );
};

export default SwitchProModel;
