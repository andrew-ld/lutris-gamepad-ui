import "../styles/PercentageBar.css";

const PercentageBar = ({
  percent,
  label,
  showValue = true,
  containerWidth,
}) => {
  return (
    <div className="percentage-bar-display">
      <div
        className="percentage-bar-container"
        style={containerWidth ? { width: containerWidth } : {}}
      >
        <div
          className="percentage-bar-fill"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      {showValue && (
        <span className="percentage-bar-value">
          {label ?? `${Math.round(percent)}%`}
        </span>
      )}
    </div>
  );
};

export default PercentageBar;
