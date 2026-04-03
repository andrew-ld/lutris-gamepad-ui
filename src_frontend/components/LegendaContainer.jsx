import React from "react";

import ButtonIcon from "./ButtonIcon";
import "../styles/LegendaContainer.css";

const LegendaContainer = React.forwardRef(
  ({ children, legendItems = [] }, ref) => {
    return (
      <div className="legenda-container">
        <div className="legenda-content" ref={ref}>
          {children}
        </div>
        {legendItems.length > 0 && (
          <div className="legenda-footer">
            <div className="legenda-items-wrapper">
              {legendItems.map((item) => (
                <ButtonIcon
                  key={item.button + (item.label || "")}
                  size="small"
                  {...item}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
);

LegendaContainer.displayName = "LegendaContainer";

export default React.memo(LegendaContainer);
