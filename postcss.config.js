const postcssPresetEnv = require("postcss-preset-env");
const minify = require("postcss-minify");
module.exports = {
  plugins: [
    postcssPresetEnv({grid: true}),
    minify(),
  ],
};
