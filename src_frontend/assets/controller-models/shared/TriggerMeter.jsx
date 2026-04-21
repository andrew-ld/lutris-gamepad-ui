const TriggerMeter = ({
  x,
  y,
  width,
  label,
  value,
  accent,
  align = "start",
}) => {
  const alignment = {
    center: { barX: -(width / 2), textAnchor: "middle" },
    end: { barX: -width, textAnchor: "end" },
    start: { barX: 0, textAnchor: "start" },
  };
  const { barX, textAnchor } = alignment[align] || alignment.start;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x="0"
        y="-5"
        textAnchor={textAnchor}
        fontSize="10"
        fill="rgba(255,255,255,0.34)"
        fontFamily="monospace"
      >
        {label} {Math.round(value * 100)}%
      </text>
      <rect
        x={barX}
        y="0"
        width={width}
        height="7"
        rx="3.5"
        fill="rgba(255,255,255,0.05)"
      />
      <rect
        x={barX}
        y="0"
        width={width * value}
        height="7"
        rx="3.5"
        fill={accent}
        opacity={0.4 + value * 0.6}
      />
    </g>
  );
};

export default TriggerMeter;
