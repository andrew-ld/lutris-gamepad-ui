const { writeFileSync } = require("fs");
const path = require("path");
const { Rule } = require("postcss");

const hoverWrapperPlugin = () => {
  return {
    postcssPlugin: "hover-wrapper",
    /** @param {Rule} rule */
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

const defaultThemeGenerator = () => {
  const colorProps = [
    "--accent-color",
    "--secondary-background",
    "--text-primary",
    "--text-secondary",
    "background",
    "background-color",
    "border",
    "border-color",
    "border-bottom",
    "border-top-color",
    "box-shadow",
    "color",
    "filter",
    "outline",
    "scrollbar-color",
    "text-shadow",
    "--primary-background",
    "border-top",
  ];

  const result = {};

  return {
    postcssPlugin: "default-theme-generator",
    prepare() {
      return {
        /** @param {Rule} rule */
        Rule(rule) {
          rule.walkDecls((decl) => {
            if (colorProps.includes(decl.prop)) {
              for (const selector of decl.parent.selectors) {
                const selectorProps = result[selector] || {};
                result[selector] = selectorProps;
                selectorProps[decl.prop] = decl.value;
              }
            }
          });
        },
      };
    },
    OnceExit() {
      writeFileSync(
        path.join(__dirname, "src_backend/generated/theme.default.json"),
        JSON.stringify(result, null, 2)
      );
    },
  };
};

defaultThemeGenerator.postcss = true;

module.exports = {
  plugins: [hoverWrapperPlugin(), defaultThemeGenerator()],
};
