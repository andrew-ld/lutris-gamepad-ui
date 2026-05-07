const path = require("node:path");

const { writeJsonFileAtomic } = require("./write-json-file-atomic.cjs");

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
  const themeProperties = new Set([
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
    "font-family",
    "--font-family",
  ]);

  const result = {};

  return {
    postcssPlugin: "default-theme-generator",
    prepare() {
      return {
        /** @param {Rule} rule */
        Rule(rule) {
          rule.walkDecls((decl) => {
            if (themeProperties.has(decl.prop)) {
              for (const selector of decl.parent.selectors) {
                const selectorProperties = result[selector] || {};
                result[selector] = selectorProperties;
                selectorProperties[decl.prop] = decl.value;
              }
            }
          });
        },
      };
    },
    OnceExit() {
      writeJsonFileAtomic(
        path.join(__dirname, "src_backend/generated/theme.default.json"),
        result,
      );
    },
  };
};

defaultThemeGenerator.postcss = true;

module.exports = {
  plugins: [hoverWrapperPlugin(), defaultThemeGenerator()],
};
