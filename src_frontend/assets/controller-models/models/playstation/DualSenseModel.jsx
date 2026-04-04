import { useLayoutEffect, useRef, useState } from "react";
import controllerBasePng from "./vendor/ps5-controller-visualizer/controller-base.png";
import stickSpritePng from "./vendor/ps5-controller-visualizer/stick-sprite.png";
import abxySpritePng from "./vendor/ps5-controller-visualizer/abxy-sprite.png";
import arrowsSpritePng from "./vendor/ps5-controller-visualizer/arrows-sprite.png";
import dpadSpritePng from "./vendor/ps5-controller-visualizer/dpad-sprite.png";
import bumperSpritePng from "./vendor/ps5-controller-visualizer/bumper-sprite.png";
import triggerSpritePng from "./vendor/ps5-controller-visualizer/trigger-sprite.png";
import psColorPng from "./vendor/ps5-controller-visualizer/ps-color.png";
import {
	BTN,
	getAxis,
	getButtonValue,
	isPressed,
} from "../../shared/utils.js";

const SCENE_WIDTH = 807;
const SCENE_HEIGHT = 651;
const MAX_STICK_MOVE = 15;
const TOUCHPAD_BUTTON_INDEX = 17;

const abs = (left, top, width, height) => ({
	position: "absolute",
	left,
	top,
	width,
	height,
});

const spriteStyle = (url) => ({
	backgroundImage: `url(${url})`,
	backgroundRepeat: "no-repeat",
});

const DualSenseModel = ({ s }) => {
	const hostRef = useRef(null);
	const [scale, setScale] = useState(1);

	useLayoutEffect(() => {
		const host = hostRef.current;
		if (!host) return undefined;

		const updateScale = () => {
			const next = Math.min(1, host.clientWidth / SCENE_WIDTH);
			setScale(Number.isFinite(next) && next > 0 ? next : 1);
		};

		updateScale();
		const observer = new ResizeObserver(updateScale);
		observer.observe(host);

		return () => observer.disconnect();
	}, []);

	const crossPressed = isPressed(s, BTN.A);
	const circlePressed = isPressed(s, BTN.B);
	const squarePressed = isPressed(s, BTN.X);
	const trianglePressed = isPressed(s, BTN.Y);
	const dpadUpPressed = isPressed(s, BTN.DPAD_UP);
	const dpadDownPressed = isPressed(s, BTN.DPAD_DOWN);
	const dpadLeftPressed = isPressed(s, BTN.DPAD_LEFT);
	const dpadRightPressed = isPressed(s, BTN.DPAD_RIGHT);
	const sharePressed = isPressed(s, BTN.SELECT);
	const optionsPressed = isPressed(s, BTN.START);
	const l1Pressed = isPressed(s, BTN.LB);
	const r1Pressed = isPressed(s, BTN.RB);
	const l3Pressed = isPressed(s, BTN.L3);
	const r3Pressed = isPressed(s, BTN.R3);
	const psPressed = isPressed(s, BTN.HOME);
	const touchpadPressed = isPressed(s, TOUCHPAD_BUTTON_INDEX);

	const l2 = getButtonValue(s, BTN.LT);
	const r2 = getButtonValue(s, BTN.RT);

	const lx = getAxis(s, 0) * MAX_STICK_MOVE;
	const ly = getAxis(s, 1) * MAX_STICK_MOVE;
	const rx = getAxis(s, 2) * MAX_STICK_MOVE;
	const ry = getAxis(s, 3) * MAX_STICK_MOVE;

	return (
		<div
			className="ct-model-wrap"
			ref={hostRef}
			style={{ height: `${SCENE_HEIGHT * scale}px` }}
		>
			<div
				style={{
					position: "relative",
					width: `${SCENE_WIDTH}px`,
					height: `${SCENE_HEIGHT}px`,
					transform: `scale(${scale})`,
					transformOrigin: "top left",
				}}
			>
				<img
					src={controllerBasePng}
					alt="DualSense controller"
					style={{ display: "block", width: "100%", height: "100%" }}
				/>

				<div style={{ ...abs(220, 333, 367, 100), pointerEvents: "none" }}>
					<div
						style={{
							...abs(0, 0, 100, 100),
							...spriteStyle(stickSpritePng),
							backgroundPosition: `${l3Pressed ? -102 : 0}px 0px`,
							transform: `translate(${lx}px, ${ly}px)`,
							transition: "transform 0.05s linear",
						}}
					/>
					<div
						style={{
							...abs(267, 0, 100, 100),
							...spriteStyle(stickSpritePng),
							backgroundPosition: `${r3Pressed ? -102 : 0}px 0px`,
							transform: `translate(${rx}px, ${ry}px)`,
							transition: "transform 0.05s linear",
						}}
					/>
				</div>

				<div style={{ ...abs(573, 178, 181, 181), pointerEvents: "none" }}>
					<div
						style={{
							...abs(61, 123, 58, 58),
							...spriteStyle(abxySpritePng),
							backgroundPosition: `0px ${crossPressed ? -59 : 0}px`,
							opacity: crossPressed ? 1 : 0,
						}}
					/>
					<div
						style={{
							...abs(123, 62, 58, 58),
							...spriteStyle(abxySpritePng),
							backgroundPosition: `${-59}px ${circlePressed ? -59 : 0}px`,
							opacity: circlePressed ? 1 : 0,
						}}
					/>
					<div
						style={{
							...abs(0, 61, 58, 58),
							...spriteStyle(abxySpritePng),
							backgroundPosition: `${-118}px ${squarePressed ? -59 : 0}px`,
							opacity: squarePressed ? 1 : 0,
						}}
					/>
					<div
						style={{
							...abs(61, 0, 58, 58),
							...spriteStyle(abxySpritePng),
							backgroundPosition: `${-177}px ${trianglePressed ? -59 : 0}px`,
							opacity: trianglePressed ? 1 : 0,
						}}
					/>
				</div>

				<div style={{ ...abs(71, 196, 144, 144), pointerEvents: "none" }}>
					<div
						style={{
							...abs(46, 0, 52, 63),
							...spriteStyle(dpadSpritePng),
							backgroundPosition: "0px -68px",
							opacity: dpadUpPressed ? 1 : 0,
						}}
					/>
					<div
						style={{
							...abs(81, 46, 63, 52),
							...spriteStyle(dpadSpritePng),
							backgroundPosition: "-175px -68px",
							opacity: dpadRightPressed ? 1 : 0,
						}}
					/>
					<div
						style={{
							...abs(46, 81, 52, 63),
							...spriteStyle(dpadSpritePng),
							backgroundPosition: "-54px -68px",
							opacity: dpadDownPressed ? 1 : 0,
						}}
					/>
					<div
						style={{
							...abs(-1, 47, 64, 52),
							...spriteStyle(dpadSpritePng),
							backgroundPosition: "-108px -68px",
							opacity: dpadLeftPressed ? 1 : 0,
						}}
					/>
				</div>

				<div
					style={{
						...abs(195, 140, 416, 57),
						pointerEvents: "none",
					}}
				>
					<div
						style={{
							...abs(0, 0, 27, 57),
							...spriteStyle(arrowsSpritePng),
							opacity: sharePressed ? 1 : 0,
							transform: sharePressed ? "translateY(1px)" : "none",
						}}
					/>
					<div
						style={{
							...abs(389, 0, 27, 57),
							...spriteStyle(arrowsSpritePng),
							backgroundPosition: "-27px 0px",
							opacity: optionsPressed ? 1 : 0,
							transform: optionsPressed ? "translateY(1px)" : "none",
						}}
					/>
				</div>

				<div style={{ ...abs(93, 114, 620, 35), pointerEvents: "none" }}>
					<div
						style={{
							...abs(0, 0, 110, 35),
							...spriteStyle(bumperSpritePng),
							backgroundPosition: "0px 0px",
							opacity: l1Pressed ? 1 : 0,
							transform: l1Pressed ? "translateY(1px)" : "none",
						}}
					/>
					<div
						style={{
							...abs(510, 0, 110, 35),
							...spriteStyle(bumperSpritePng),
							backgroundPosition: "0px 0px",
							opacity: r1Pressed ? 1 : 0,
							transform: `${r1Pressed ? "translateY(1px) " : ""}scaleX(-1)`,
							transformOrigin: "center",
						}}
					/>
				</div>

				<div style={{ ...abs(94, 0, 619, 108), pointerEvents: "none" }}>
					<div
						style={{
							...abs(0, 0, 111, 108),
							...spriteStyle(triggerSpritePng),
							opacity: l2 > 0.05 ? l2 : 0,
						}}
					/>
					<div
						style={{
							...abs(508, 0, 111, 108),
							...spriteStyle(triggerSpritePng),
							backgroundPosition: "-113px 0px",
							opacity: r2 > 0.05 ? r2 : 0,
						}}
					/>
				</div>

				<div
					style={{
						...abs(373, 345, 60, 60),
						...spriteStyle(psColorPng),
						backgroundSize: "contain",
						backgroundPosition: "center",
						opacity: psPressed ? 1 : 0,
						transform: psPressed ? "translateY(1px)" : "none",
						pointerEvents: "none",
					}}
				/>

				<div
					style={{
						...abs(380, 200, 40, 40),
						borderRadius: "50%",
						background: "rgba(45, 90, 240, 0.85)",
						boxShadow: "0 0 10px rgba(45, 90, 240, 0.6)",
						opacity: touchpadPressed ? 1 : 0,
						transform: touchpadPressed ? "translateY(1px)" : "none",
						pointerEvents: "none",
					}}
				/>
			</div>
		</div>
	);
};

export default DualSenseModel;
