const postcssPresetEnv = require("postcss-preset-env");
const postcssImport = require("postcss-import");
module.exports = {
  plugins: [
    postcssPresetEnv({grid: true}),
    postcssImport({path: ["./node_modules"]}),
  ],
};
