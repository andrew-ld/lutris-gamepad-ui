import dualShock3Svg from "./vendor/dualshock3-controller.svg";
import {
	BTN,
	getAxis,
	getButtonValue,
	isPressed,
} from "../../shared/utils.js";

const DualShock3Model = ({ s }) => {
	const stickTravel = 10;
	const lx = 143.4 + getAxis(s, 0) * stickTravel;
	const ly = 154 + getAxis(s, 1) * stickTravel;
	const rx = 258 + getAxis(s, 2) * stickTravel;
	const ry = 154 + getAxis(s, 3) * stickTravel;
	const lt = getButtonValue(s, BTN.LT);
	const rt = getButtonValue(s, BTN.RT);

	return (
		<div className="ct-model-wrap">
			<img className="ct-model-base" src={dualShock3Svg} alt="DualShock 3 controller" />
			<svg className="ct-model-overlay" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
				<path d="M 52 85 H 69 L 75 93.5 L 69 102 H 52 Z M 48 88 V 99 L 43 93.5 Z" fill={isPressed(s, BTN.DPAD_LEFT) ? "#4d88cf" : "transparent"} />
				<path d="M 115 85 H 98 L 92 93.5 L 98 102 H 115 Z M 119 88 V 99 L 124 93.5 Z" fill={isPressed(s, BTN.DPAD_RIGHT) ? "#4d88cf" : "transparent"} />
				<path d="M 75 62 V 79 L 83.5 85 L 92 79 V 62 Z M 78 58 H 89 L 83.5 53 Z" fill={isPressed(s, BTN.DPAD_UP) ? "#4d88cf" : "transparent"} />
				<path d="M 75 125 V 108 L 83.5 102 L 92 108 V 125 Z M 78 129 H 89 L 83.5 134 Z" fill={isPressed(s, BTN.DPAD_DOWN) ? "#4d88cf" : "transparent"} />

				<rect x="282" y="86.5" width="15" height="15" fill={isPressed(s, BTN.X) ? "#cb79b1" : "transparent"} />
				<circle cx="347.5" cy="93.5" r="9" fill={isPressed(s, BTN.B) ? "#f16667" : "transparent"} />
				<path d="M 310 70 H 327 L 318.5 56 Z" fill={isPressed(s, BTN.Y) ? "#66c194" : "transparent"} />
				<path d="M 311.5 115.5 L 325.5 129.5 M 311.5 129.5 L 325.5 115.5" stroke={isPressed(s, BTN.A) ? "#7fb1df" : "transparent"} strokeWidth="3" />

				<text x="318.5" y="68.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#66c194" opacity={isPressed(s, BTN.Y) ? 1 : 0.95}>Y</text>
				<text x="347.5" y="96.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#f16667" opacity={isPressed(s, BTN.B) ? 1 : 0.95}>B</text>
				<text x="289.5" y="96.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#cb79b1" opacity={isPressed(s, BTN.X) ? 1 : 0.95}>X</text>
				<text x="318.5" y="125.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#7fb1df" opacity={isPressed(s, BTN.A) ? 1 : 0.95}>A</text>

				<rect x="155" y="95" width="20" height="10" fill={isPressed(s, BTN.SELECT) ? "#4d88cf" : "transparent"} />
				<path d="M 226 95 V 105 L 244 100 Z" fill={isPressed(s, BTN.START) ? "#4d88cf" : "transparent"} />
				<circle cx="201" cy="129" r="13" fill={isPressed(s, BTN.HOME) ? "#4d88cf" : "transparent"} />

				<path d="M 107 10.6 C 94.4 6.7, 74.8 6.5, 60.5 10.6" stroke="#4d88cf" strokeWidth="3" fill="none" opacity={isPressed(s, BTN.LB) ? 1 : 0} />
				<path d="M 343.7 11.2 C 329.4 6.7, 309.8 6.5, 295.5 10.6" stroke="#4d88cf" strokeWidth="3" fill="none" opacity={isPressed(s, BTN.RB) ? 1 : 0} />
				<path d="M 116.5 41.6 C 116.9 40.5, 116 35.6, 115 29.9 C 112.7 14.7, 112.5 14.3, 108.9 12 C 108 11.4, 106.4 10.2, 105.4 9.3 C 100.4 4.6, 89 2.3, 77.4 3.5 C 70.7 4.2, 65.6 6.1, 62.2 9.2 C 61 10.2, 59.5 11.4, 58.7 11.9 C 56.8 13, 55 15.1, 54.6 16.8 C 54.2 18.1, 51.6 34, 50 42.4" fill="none" stroke="#4d88cf" strokeWidth="5" opacity={lt} />
				<path d="M 351.9 42.3 C 351.8 40.5, 351 35.6, 350 29.9 C 347.7 14.7, 347.5 14.3, 343.9 11.5 C 343 10, 341.4 9.2, 342.6 9.8 C 335.4 4.6, 324 2.3, 312.4 3.5 C 305.7 4.2, 300.6 6.1, 297.1 9.2 C 296 10.2, 294.5 11.4, 293.7 11.9 C 291.8 13,  290.1 15.1, 289.6 16.8 C 289.2 18.1, 286.6 34, 285 42.4" fill="none" stroke="#4d88cf" strokeWidth="5" opacity={rt} />

				<circle cx={lx} cy={ly} r="27" fill={isPressed(s, BTN.L3) ? "#4d88cf" : "rgba(77,136,207,0.18)"} stroke={isPressed(s, BTN.L3) ? "#4d88cf" : "rgba(77,136,207,0.45)"} strokeWidth="2" className="ct-stick-anim" />
				<circle cx={rx} cy={ry} r="27" fill={isPressed(s, BTN.R3) ? "#4d88cf" : "rgba(77,136,207,0.18)"} stroke={isPressed(s, BTN.R3) ? "#4d88cf" : "rgba(77,136,207,0.45)"} strokeWidth="2" className="ct-stick-anim" />
			</svg>
		</div>
	);
};

export default DualShock3Model;
