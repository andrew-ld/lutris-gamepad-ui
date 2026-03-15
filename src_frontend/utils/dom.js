export const findScrollableParent = (element) => {
  let element_ = element;
  while (element_ && element_ !== document.body) {
    const style = globalThis.getComputedStyle(element_);
    if (
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      element_.scrollHeight > element_.clientHeight
    ) {
      return element_;
    }
    element_ = element_.parentElement;
  }
  return null;
};
