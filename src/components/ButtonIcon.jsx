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

const ButtonIcon = ({ button, label, size = "large", onClick }) => {
  let content = button;
  if (button.toLowerCase() === "super") {
    content = <SuperIcon />;
  }
  return (
    <div
      className={`button-hint size-${size} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
    >
      <div className={`button-icon button-${button.toLowerCase()}`}>
        {content}
      </div>
      {label && <span className="button-label">{label}</span>}
    </div>
  );
};

export default ButtonIcon;
