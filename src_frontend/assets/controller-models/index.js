import JoyConModel from "./models/nintendo/JoyConModel.jsx";
import SwitchProModel from "./models/nintendo/SwitchProModel.jsx";
import DualSenseModel from "./models/playstation/DualSenseModel.jsx";
import DualShock3Model from "./models/playstation/DualShock3Model.jsx";
import DualShock4Model from "./models/playstation/DualShock4Model.jsx";
import Xbox360Model from "./models/xbox/Xbox360Model.jsx";
import XboxOneModel from "./models/xbox/XboxOneModel.jsx";
import XboxSeriesModel from "./models/xbox/XboxSeriesModel.jsx";

function getControllerText(controller) {
  return [
    controller?.name,
    controller?.rawName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function nameMatches(controller, pattern) {
  return pattern.test(getControllerText(controller));
}

export const MODEL_REGISTRY = [
  {
    id: "playstation-dualsense",
    component: DualSenseModel,
    matchController: (controller) =>
      controller?.family === "playstation" && nameMatches(controller, /dualsense|ps5|playstation 5/),
  },
  {
    id: "playstation-dualshock3",
    component: DualShock3Model,
    matchController: (controller) =>
      controller?.family === "playstation" && nameMatches(controller, /dualshock\s*3|\bps3\b|playstation 3/),
  },
  {
    id: "playstation-dualshock4",
    component: DualShock4Model,
    matchController: (controller) =>
      controller?.family === "playstation" && nameMatches(controller, /dualshock\s*4|\bps4\b|playstation 4/),
  },
  {
    id: "playstation-dualshock4",
    component: DualShock4Model,
    matchController: (controller) => controller?.family === "playstation",
  },
  {
    id: "xbox-series",
    component: XboxSeriesModel,
    matchController: (controller) =>
      controller?.family === "xbox" && nameMatches(controller, /xbox\s*series|series\s*[xs]/),
  },
  {
    id: "xbox-360",
    component: Xbox360Model,
    matchController: (controller) =>
      controller?.family === "xbox" && nameMatches(controller, /xbox\s*360|x360/),
  },
  {
    id: "xbox-one",
    component: XboxOneModel,
    matchController: (controller) =>
      controller?.family === "xbox" && nameMatches(controller, /xbox\s*one|elite|xbox wireless controller/),
  },
  {
    id: "xbox-one",
    component: XboxOneModel,
    matchController: (controller) => controller?.family === "xbox",
  },
  {
    id: "nintendo-joycon",
    component: JoyConModel,
    matchController: (controller) =>
      controller?.family === "nintendo" && nameMatches(controller, /joy-?con|left joy|right joy|combined joy/),
  },
  {
    id: "nintendo-switch-pro",
    component: SwitchProModel,
    matchController: (controller) =>
      controller?.family === "nintendo" && nameMatches(controller, /switch\s*pro|switch 2 pro|pro controller/),
  },
  {
    id: "nintendo-switch-pro",
    component: SwitchProModel,
    matchController: (controller) => controller?.family === "nintendo",
  },
];

export const MODEL_COMPONENTS = {
  "playstation-dualsense": DualSenseModel,
  "playstation-dualshock3": DualShock3Model,
  "playstation-dualshock4": DualShock4Model,
  "xbox-series": XboxSeriesModel,
  "xbox-360": Xbox360Model,
  "xbox-one": XboxOneModel,
  "nintendo-joycon": JoyConModel,
  "nintendo-switch-pro": SwitchProModel,
};

export function resolveControllerModel(controller) {
  for (const model of MODEL_REGISTRY) {
    if (model.matchController(controller)) {
      return model.id;
    }
  }

  if (controller?.family === "playstation") {
    return "playstation-dualshock4";
  }

  if (controller?.family === "nintendo") {
    return "nintendo-switch-pro";
  }

  if (controller?.family === "xbox") {
    return "xbox-one";
  }

  return "xbox-one";
}

export { default as DualSenseModel } from "./models/playstation/DualSenseModel.jsx";
export { default as DualShock3Model } from "./models/playstation/DualShock3Model.jsx";
export { default as DualShock4Model } from "./models/playstation/DualShock4Model.jsx";
export { default as JoyConModel } from "./models/nintendo/JoyConModel.jsx";
export { default as SwitchProModel } from "./models/nintendo/SwitchProModel.jsx";
export { default as Xbox360Model } from "./models/xbox/Xbox360Model.jsx";
export { default as XboxOneModel } from "./models/xbox/XboxOneModel.jsx";
export { default as XboxSeriesModel } from "./models/xbox/XboxSeriesModel.jsx";
