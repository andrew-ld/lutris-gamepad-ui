import "../styles/ButtonIcon.css";

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

const ButtonIcon = ({ button, label, size = "large", onClick }) => {
  let content = button;
  const buttonLower = button.toLowerCase();

  if (buttonLower === "super") {
    content = <SuperIcon />;
  } else if (buttonLower === "left") {
    content = <LeftArrowIcon />;
  } else if (buttonLower === "right") {
    content = <RightArrowIcon />;
  }

  return (
    <div
      className={`button-hint size-${size} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
    >
      <div className={`button-icon button-${buttonLower}`}>{content}</div>
      {label && <span className="button-label">{label}</span>}
    </div>
  );
};

export default ButtonIcon;
