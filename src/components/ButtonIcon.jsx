import React, { useState, useEffect } from "react";
import "../styles/ButtonIcon.css";
import { useInput } from "../contexts/InputContext";

const SuperIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="1em"
    height="1em"
  >
    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7.5,6L12,10.5L16.5,6L18,7.5L13.5,12L18,16.5L16.5,18L12,13.5L7.5,18L6,16.5L10.5,12L6,7.5L7.5,6Z" />
  </svg>
);

const LeftArrowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="1em"
    height="1em"
  >
    <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
  </svg>
);

const RightArrowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="1em"
    height="1em"
  >
    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
  </svg>
);

const PlayStationCrossIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    width="0.8em"
    height="0.8em"
  >
    <path d="M6 6L18 18M18 6L6 18" />
  </svg>
);

const PlayStationCircleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    width="0.9em"
    height="0.9em"
  >
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const PlayStationSquareIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinejoin="round"
    width="0.8em"
    height="0.8em"
  >
    <rect x="4.5" y="4.5" width="15" height="15" />
  </svg>
);

const PlayStationTriangleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinejoin="round"
    width="0.9em"
    height="0.9em"
  >
    <path d="M12 3L21.5 19.5H2.5L12 3Z" />
  </svg>
);

const CtrlXIcon = () => (
  <svg
    viewBox="0 0 36 24"
    fill="currentColor"
    width="1.5em"
    height="1em"
    style={{ letterSpacing: "0.5px" }}
  >
    <text
      x="50%"
      y="50%"
      dominantBaseline="middle"
      textAnchor="middle"
      fontSize="11"
      fontFamily="sans-serif"
      fontWeight="bold"
    >
      Ctrl+X
    </text>
  </svg>
);

const BUTTON_CONTENT_MAP = {
  keyboard: {
    super: <CtrlXIcon />,
  },
  xbox: {},
  playstation: {
    a: <PlayStationCrossIcon />,
    b: <PlayStationCircleIcon />,
    x: <PlayStationSquareIcon />,
    y: <PlayStationTriangleIcon />,
  },
  generic: {
    a: "A",
    b: "B",
    x: "X",
    y: "Y",
    super: <SuperIcon />,
    left: <LeftArrowIcon />,
    right: <RightArrowIcon />,
  },
};

const ButtonIcon = ({ button, label, size = "large", onClick }) => {
  const { getLatestInputType, subscribeToInputType } = useInput();

  const [latestInputType, setLatestInputType] = useState(() =>
    getLatestInputType()
  );

  useEffect(() => {
    const unsubscribe = subscribeToInputType(setLatestInputType);
    return unsubscribe;
  }, [subscribeToInputType]);

  const buttonLower = button.toLowerCase();
  const styleClass = `button-icon button-${latestInputType}-${buttonLower}`;

  const content =
    BUTTON_CONTENT_MAP[latestInputType]?.[buttonLower] ||
    BUTTON_CONTENT_MAP.generic[buttonLower] ||
    button;

  return (
    <div
      className={`button-hint size-${size} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
    >
      <div className={styleClass}>{content}</div>
      {label && <span className="button-label">{label}</span>}
    </div>
  );
};

export default React.memo(ButtonIcon);
