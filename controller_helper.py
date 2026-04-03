#!/usr/bin/env python3

import argparse
import glob
import json
import os
import selectors
import signal
import sys
from pathlib import Path
from typing import Optional

try:
    import evdev
    from evdev import ecodes
except Exception:
    evdev = None
    ecodes = None


CONTROLLER_KEYWORDS = (
    "controller",
    "gamepad",
    "joystick",
    "xbox",
    "dualsense",
    "dualshock",
    "wireless controller",
    "8bitdo",
    "pro controller",
    "switch pro",
    "joycon",
    "joy-con",
    "steam controller",
)

# VID → controller family. Takes priority over name-based detection.
VENDOR_FAMILY_MAP = {
    "054c": "playstation",  # Sony Interactive Entertainment
    "045e": "xbox",         # Microsoft Corporation
    "057e": "nintendo",     # Nintendo Co., Ltd
    "28de": "steam",        # Valve Corporation
    "2dc8": "8bitdo",       # 8BitDo Technology
    "0f0d": "generic",      # Hori Co., Ltd
    "0079": "generic",      # DragonRise Inc. (generic USB gamepads)
    "0810": "generic",      # Personal Communication Systems
    "046d": "generic",      # Logitech
}

# Sony PID → specific family (dualsense vs dualshock vs generic playstation)
SONY_PRODUCT_FAMILIES = {
    "0ce6": "dualsense",    # DualSense (PS5)
    "0df2": "dualsense",    # DualSense Edge
    "0e5f": "dualsense",    # DualSense Access Controller
    "09cc": "dualshock",    # DualShock 4 (CUH-ZCT2, 2nd gen)
    "05c4": "dualshock",    # DualShock 4 (CUH-ZCT1, 1st gen)
    "0ba0": "dualshock",    # DualShock 4 USB Wireless Adaptor
}

DEFAULT_CAPABILITIES = {
    "buttons": [
        "BTN_SOUTH",
        "BTN_EAST",
        "BTN_NORTH",
        "BTN_WEST",
        "BTN_TL",
        "BTN_TR",
        "BTN_SELECT",
        "BTN_START",
        "BTN_MODE",
        "BTN_THUMBL",
        "BTN_THUMBR",
        "BTN_DPAD_UP",
        "BTN_DPAD_DOWN",
        "BTN_DPAD_LEFT",
        "BTN_DPAD_RIGHT",
    ],
    "axes": [
        "ABS_X",
        "ABS_Y",
        "ABS_RX",
        "ABS_RY",
        "ABS_Z",
        "ABS_RZ",
        "ABS_HAT0X",
        "ABS_HAT0Y",
    ],
}

RUNNING = True

TARGET_DEVICE_CONFIGS = {
    "xinput": {
        "name": "Aegis Virtual Xbox Controller",
        "vendor": 0x045E,
        "product": 0x028E,
        "version": 0x0110,
        "bustype": 0x03,
    },
    "dualsense": {
        "name": "Sony Interactive Entertainment DualSense Wireless Controller",
        "vendor": 0x054C,
        "product": 0x0CE6,
        "version": 0x8111,
        "bustype": 0x05,
    },
}


def classify_family(name: str, vendor_id: str = "0000", product_id: str = "0000") -> str:
    # VID/PID-based detection takes priority over name matching.
    vid = (vendor_id or "0000").lower().zfill(4)
    pid = (product_id or "0000").lower().zfill(4)

    if vid in VENDOR_FAMILY_MAP:
        base_family = VENDOR_FAMILY_MAP[vid]
        if base_family == "playstation":
            return SONY_PRODUCT_FAMILIES.get(pid, "playstation")
        return base_family

    # Fall back to name-based detection for unrecognised vendors.
    value = (name or "").lower()
    if "dualsense" in value or "ps5" in value:
        return "dualsense"
    if "dualshock" in value or "wireless controller" in value or "ps4" in value:
        return "dualshock"
    if "xbox" in value:
        return "xbox"
    if "8bitdo" in value:
        return "8bitdo"
    if (
        "switch" in value
        or "joycon" in value
        or "joy-con" in value
        or "pro controller" in value
    ):
        return "nintendo"
    if "steam controller" in value or ("valve" in value and "controller" in value):
        return "steam"
    if any(keyword in value for keyword in CONTROLLER_KEYWORDS):
        return "generic"
    return "unknown"


def infer_connection_type(sysfs_root: Path) -> str:
    try:
        path_str = str(sysfs_root.resolve())
    except Exception:
        path_str = str(sysfs_root)

    lowered = path_str.lower()
    if "bluetooth" in lowered:
        return "bluetooth"
    if "usb" in lowered:
        return "usb"
    return "unknown"


def detect_capabilities(name: str, evdev_caps: Optional[dict] = None) -> list:
    family = classify_family(name)
    capabilities = ["buttons", "sticks"]

    if evdev_caps is not None and ecodes is not None:
        abs_codes = _normalize_abs_codes(evdev_caps.get(ecodes.EV_ABS, []))
        if ecodes.ABS_Z in abs_codes or ecodes.ABS_RZ in abs_codes:
            capabilities.append("triggers")
        ff_effects = evdev_caps.get(ecodes.EV_FF, [])
        if ff_effects:
            capabilities.append("rumble")
    else:
        # Nintendo Pro Controller has digital shoulder buttons, no analog triggers.
        if family not in {"nintendo"}:
            capabilities.append("triggers")

    # Gyro and touchpad are inferred from controller family since evdev exposes
    # them on a separate input node that isn't the gamepad interface.
    if family in {"dualsense", "dualshock"}:
        capabilities.extend(["gyro", "touchpad"])
    elif family in {"nintendo", "steam"}:
        capabilities.append("gyro")

    return sorted(set(capabilities))


def _normalize_abs_codes(raw_abs_codes):
    normalized = set()
    for code in raw_abs_codes:
        if isinstance(code, tuple):
            normalized.add(code[0])
        else:
            normalized.add(code)
    return normalized


def _looks_like_gamepad(device) -> bool:
    if evdev is None or ecodes is None:
        return False

    capabilities = device.capabilities()
    key_codes = set(capabilities.get(ecodes.EV_KEY, []))
    abs_codes = _normalize_abs_codes(capabilities.get(ecodes.EV_ABS, []))

    has_gamepad_buttons = any(
        code in key_codes
        for code in (
            ecodes.BTN_SOUTH,
            ecodes.BTN_EAST,
            ecodes.BTN_NORTH,
            ecodes.BTN_WEST,
            ecodes.BTN_TL,
            ecodes.BTN_TR,
            ecodes.BTN_SELECT,
            ecodes.BTN_START,
            ecodes.BTN_MODE,
            ecodes.BTN_THUMBL,
            ecodes.BTN_THUMBR,
        )
    )
    has_gamepad_axes = any(
        code in abs_codes
        for code in (
            ecodes.ABS_X,
            ecodes.ABS_Y,
            ecodes.ABS_RX,
            ecodes.ABS_RY,
            ecodes.ABS_HAT0X,
            ecodes.ABS_HAT0Y,
        )
    )

    return has_gamepad_buttons and has_gamepad_axes


def _controller_from_evdev(device):
    event_name = os.path.basename(device.path)
    event_root = Path("/sys/class/input") / event_name / "device"
    vendor_id = "0000"
    product_id = "0000"

    try:
        vendor_id = (event_root / "id" / "vendor").read_text(encoding="utf8").strip()
        product_id = (event_root / "id" / "product").read_text(encoding="utf8").strip()
    except Exception:
        pass

    evdev_caps = device.capabilities()
    family = classify_family(device.name, vendor_id, product_id)

    return {
        "id": event_name,
        "name": device.name,
        "vendorId": vendor_id.lower(),
        "productId": product_id.lower(),
        "connectionType": infer_connection_type(event_root),
        "family": family,
        "capabilities": detect_capabilities(device.name, evdev_caps),
        "eventPath": device.path,
    }


def enumerate_input_candidates():
    controllers = []

    if evdev is not None:
        for device_path in evdev.list_devices():
            try:
                device = evdev.InputDevice(device_path)
            except Exception:
                continue

            try:
                if _looks_like_gamepad(device):
                    controllers.append(_controller_from_evdev(device))
            finally:
                device.close()

    if controllers:
        for index, controller in enumerate(controllers):
            controller["isPrimary"] = index == 0
        return controllers

    for event_path in sorted(glob.glob("/sys/class/input/event*")):
        event_root = Path(event_path)
        device_name_path = event_root / "device" / "name"
        if not device_name_path.exists():
            continue

        try:
            name = device_name_path.read_text(encoding="utf8").strip()
        except Exception:
            continue

        lowered = name.lower()
        if not any(keyword in lowered for keyword in CONTROLLER_KEYWORDS):
            continue

        event_name = event_root.name
        vendor_id = "0000"
        product_id = "0000"

        try:
            vendor_id = (event_root / "device" / "id" / "vendor").read_text(encoding="utf8").strip()
            product_id = (event_root / "device" / "id" / "product").read_text(encoding="utf8").strip()
        except Exception:
            pass

        controllers.append(
            {
                "id": event_name,
                "name": name,
                "vendorId": vendor_id.lower(),
                "productId": product_id.lower(),
                "connectionType": infer_connection_type(event_root / "device"),
                "family": classify_family(name, vendor_id, product_id),
                "capabilities": detect_capabilities(name),
                "eventPath": f"/dev/input/{event_name}",
            }
        )

    for index, controller in enumerate(controllers):
        controller["isPrimary"] = index == 0

    return controllers


def build_probe():
    uinput_path = "/dev/uinput"
    uinput_access = os.access(uinput_path, os.R_OK | os.W_OK)
    return {
        "python_ok": True,
        "evdev_available": evdev is not None,
        "uinput_present": os.path.exists(uinput_path),
        "uinput_access": uinput_access,
        "uinput_path": uinput_path,
        "running_in_container": os.path.exists("/.dockerenv")
        or os.path.exists("/run/.containerenv"),
        "controller_count": len(enumerate_input_candidates()),
    }


def create_virtual_capabilities():
    if evdev is None:
        return None

    button_codes = [getattr(ecodes, code) for code in DEFAULT_CAPABILITIES["buttons"]]
    axis_codes = [
        (
            getattr(ecodes, code),
            evdev.AbsInfo(value=0, min=-32768, max=32767, fuzz=16, flat=128, resolution=0),
        )
        for code in DEFAULT_CAPABILITIES["axes"][:4]
    ]
    trigger_codes = [
        (
            getattr(ecodes, code),
            evdev.AbsInfo(value=0, min=0, max=255, fuzz=0, flat=0, resolution=0),
        )
        for code in DEFAULT_CAPABILITIES["axes"][4:6]
    ]
    hat_codes = [
        (
            getattr(ecodes, code),
            evdev.AbsInfo(value=0, min=-1, max=1, fuzz=0, flat=0, resolution=0),
        )
        for code in DEFAULT_CAPABILITIES["axes"][6:]
    ]

    return {
        ecodes.EV_KEY: button_codes,
        ecodes.EV_ABS: axis_codes + trigger_codes + hat_codes,
    }

def _scale_value(value, source_min, source_max, target_min, target_max):
    if source_max == source_min:
        return target_min

    ratio = (value - source_min) / (source_max - source_min)
    scaled = target_min + ratio * (target_max - target_min)
    return int(round(scaled))


def _source_abs_info(device, code):
    try:
        return device.absinfo(code)
    except Exception:
        return None


def _target_abs_range(code):
    if code in (
        ecodes.ABS_X,
        ecodes.ABS_Y,
        ecodes.ABS_RX,
        ecodes.ABS_RY,
    ):
        return (-32768, 32767)
    if code in (ecodes.ABS_Z, ecodes.ABS_RZ):
        return (0, 255)
    if code in (ecodes.ABS_HAT0X, ecodes.ABS_HAT0Y):
        return (-1, 1)
    return None


def _clamp(value, lower, upper):
    return max(lower, min(upper, value))


def _remap_abs_event(device, event):
    target_range = _target_abs_range(event.code)
    if target_range is None:
        return event.code, event.value

    source_abs_info = _source_abs_info(device, event.code)
    if source_abs_info is None:
        return event.code, event.value

    source_min = source_abs_info.min
    source_max = source_abs_info.max
    target_min, target_max = target_range

    if source_min == target_min and source_max == target_max:
        value = event.value
    else:
        value = _scale_value(event.value, source_min, source_max, target_min, target_max)

    return (event.code, _clamp(value, target_min, target_max))


def _remap_key_event(event):
    # Normalize Linux gamepad buttons onto the intended virtual layout.
    key_map = {
        ecodes.BTN_A: ecodes.BTN_SOUTH,
        ecodes.BTN_B: ecodes.BTN_EAST,
        ecodes.BTN_X: ecodes.BTN_WEST,
        ecodes.BTN_Y: ecodes.BTN_NORTH,
        ecodes.BTN_THUMB: ecodes.BTN_THUMBL,
        ecodes.BTN_THUMB2: ecodes.BTN_THUMBR,
        ecodes.BTN_TOP: ecodes.BTN_WEST,
        ecodes.BTN_TOP2: ecodes.BTN_NORTH,
    }
    return key_map.get(event.code, event.code), event.value


def _remap_trigger_button_event(event):
    if event.code == ecodes.BTN_TL2:
        return ecodes.ABS_Z, 255 if event.value else 0
    if event.code == ecodes.BTN_TR2:
        return ecodes.ABS_RZ, 255 if event.value else 0
    return None


def _update_dpad_state(dpad_state, event):
    if event.code == ecodes.BTN_DPAD_LEFT:
        dpad_state["left"] = bool(event.value)
    elif event.code == ecodes.BTN_DPAD_RIGHT:
        dpad_state["right"] = bool(event.value)
    elif event.code == ecodes.BTN_DPAD_UP:
        dpad_state["up"] = bool(event.value)
    elif event.code == ecodes.BTN_DPAD_DOWN:
        dpad_state["down"] = bool(event.value)

    hat_x = 0
    hat_y = 0

    if dpad_state["left"] and not dpad_state["right"]:
        hat_x = -1
    elif dpad_state["right"] and not dpad_state["left"]:
        hat_x = 1

    if dpad_state["up"] and not dpad_state["down"]:
        hat_y = -1
    elif dpad_state["down"] and not dpad_state["up"]:
        hat_y = 1

    return hat_x, hat_y


def _write_dpad_state(ui, dpad_state):
    hat_x = 0
    hat_y = 0

    if dpad_state["left"] and not dpad_state["right"]:
        hat_x = -1
    elif dpad_state["right"] and not dpad_state["left"]:
        hat_x = 1

    if dpad_state["up"] and not dpad_state["down"]:
        hat_y = -1
    elif dpad_state["down"] and not dpad_state["up"]:
        hat_y = 1

    ui.write(ecodes.EV_ABS, ecodes.ABS_HAT0X, hat_x)
    ui.write(ecodes.EV_ABS, ecodes.ABS_HAT0Y, hat_y)
    ui.write(ecodes.EV_KEY, ecodes.BTN_DPAD_LEFT, int(dpad_state["left"]))
    ui.write(ecodes.EV_KEY, ecodes.BTN_DPAD_RIGHT, int(dpad_state["right"]))
    ui.write(ecodes.EV_KEY, ecodes.BTN_DPAD_UP, int(dpad_state["up"]))
    ui.write(ecodes.EV_KEY, ecodes.BTN_DPAD_DOWN, int(dpad_state["down"]))
    ui.syn()


def _update_dpad_state_from_hat(dpad_state, code, value):
    if code == ecodes.ABS_HAT0X:
        dpad_state["left"] = value < 0
        dpad_state["right"] = value > 0
    elif code == ecodes.ABS_HAT0Y:
        dpad_state["up"] = value < 0
        dpad_state["down"] = value > 0


def _create_virtual_device(mode):
    config = TARGET_DEVICE_CONFIGS[mode]
    return evdev.UInput(
        create_virtual_capabilities(),
        name=config["name"],
        vendor=config["vendor"],
        product=config["product"],
        version=config["version"],
        bustype=config["bustype"],
    )


def serve_virtual_controller(mode: str, controller_id: Optional[str], exclusive_grab: bool):
    if evdev is None:
        raise RuntimeError("python-evdev is not installed")

    controllers = enumerate_input_candidates()
    selected = None
    for controller in controllers:
        if controller_id is None or controller["id"] == controller_id:
            selected = controller
            break

    if not selected:
        raise RuntimeError("No compatible controller was found for the helper session")

    input_device = evdev.InputDevice(selected["eventPath"])
    ui = _create_virtual_device(mode)

    if exclusive_grab:
        input_device.grab()

    selector = selectors.DefaultSelector()
    selector.register(input_device.fd, selectors.EVENT_READ)
    dpad_state = {
        "left": False,
        "right": False,
        "up": False,
        "down": False,
    }

    print(
        json.dumps(
            {
                "status": "ready",
                "mode": mode,
                "controller": selected["name"],
                "exclusive": exclusive_grab,
                "vendorId": selected.get("vendorId", "0000"),
                "productId": selected.get("productId", "0000"),
            }
        ),
        flush=True,
    )

    try:
        while RUNNING:
            for _key, _mask in selector.select(timeout=0.25):
                for event in input_device.read():
                    if event.type == ecodes.EV_KEY:
                        trigger_remap = _remap_trigger_button_event(event)
                        if trigger_remap is not None:
                            code, value = trigger_remap
                            ui.write(ecodes.EV_ABS, code, value)
                            ui.syn()
                            continue

                        if event.code in (
                            ecodes.BTN_DPAD_LEFT,
                            ecodes.BTN_DPAD_RIGHT,
                            ecodes.BTN_DPAD_UP,
                            ecodes.BTN_DPAD_DOWN,
                        ):
                            _update_dpad_state(dpad_state, event)
                            _write_dpad_state(ui, dpad_state)
                            continue

                        code, value = _remap_key_event(event)
                        ui.write(event.type, code, value)
                        ui.syn()
                    elif event.type == ecodes.EV_ABS:
                        code, value = _remap_abs_event(input_device, event)
                        if code in (ecodes.ABS_HAT0X, ecodes.ABS_HAT0Y):
                            _update_dpad_state_from_hat(dpad_state, code, value)
                            _write_dpad_state(ui, dpad_state)
                            continue
                        ui.write(event.type, code, value)
                        ui.syn()
    finally:
        try:
            if exclusive_grab:
                input_device.ungrab()
        except Exception:
            pass
        ui.close()
        input_device.close()


def handle_signal(_signum, _frame):
    global RUNNING
    RUNNING = False


def main():
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("probe")
    subparsers.add_parser("list")

    serve_parser = subparsers.add_parser("serve")
    serve_parser.add_argument("--mode", default="xinput")
    serve_parser.add_argument("--controller-id")
    serve_parser.add_argument("--exclusive-grab", action="store_true")

    arguments = parser.parse_args()

    if arguments.command == "probe":
        print(json.dumps(build_probe()))
        return 0

    if arguments.command == "list":
        print(json.dumps({"controllers": enumerate_input_candidates()}))
        return 0

    if arguments.command == "serve":
        if arguments.mode not in TARGET_DEVICE_CONFIGS:
            raise RuntimeError(f"Unsupported serve mode: {arguments.mode}")
        serve_virtual_controller(
            arguments.mode,
            arguments.controller_id,
            arguments.exclusive_grab,
        )
        return 0

    return 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"status": "error", "error": str(error)}), file=sys.stderr)
        raise
