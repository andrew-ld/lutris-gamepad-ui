import icon from "../resources/icon.svg";
import "../styles/BootSplash.css";

const BootSplash = () => {
  return (
    <div className="boot-splash" role="status" aria-label="Loading">
      <img className="boot-splash-icon" src={icon} alt="" aria-hidden="true" />
    </div>
  );
};

export default BootSplash;
