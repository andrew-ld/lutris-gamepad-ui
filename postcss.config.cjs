const hoverWrapperPlugin = () => {
  return {
    postcssPlugin: "hover-wrapper",
    Rule(rule) {
      if (rule.selector.includes(":hover")) {
        rule.selectors = rule.selectors.map((selector) => {
          if (selector.includes(":hover")) {
            return `body.mouse-active ${selector}`;
          }
          return selector;
        });
      }
    },
  };
};

hoverWrapperPlugin.postcss = true;

module.exports = {
  plugins: [hoverWrapperPlugin()],
};
