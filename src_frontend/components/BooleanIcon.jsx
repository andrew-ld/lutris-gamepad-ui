import "../styles/BooleanIcon.css";

const BooleanIcon = ({ children, checked }) => {
  return (
    <div class="checkmark-wrapper">
      <div class={checked ? "checkmark checked" : "checkmark unchecked"}>
        <div class="check-icon"></div>
      </div>
      <div>{children}</div>
    </div>
  );
};

export default BooleanIcon;
