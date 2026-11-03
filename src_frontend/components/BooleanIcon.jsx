import "../styles/BooleanIcon.css";

const BooleanIcon = ({ children, checked }) => {
  return (
    <div class="checkmark-wrapper">
      <div class="checkmark">
        <div
          class={checked ? "check-icon checked" : "check-icon unchecked"}
        ></div>
      </div>
      <div>{children}</div>
    </div>
  );
};

export default BooleanIcon;
