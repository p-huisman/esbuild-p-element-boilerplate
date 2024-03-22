import postcssPresetEnv from "postcss-preset-env";
import minify from "postcss-minify";

export default {
  plugins: [
    postcssPresetEnv({grid: true}),
    minify(),
  ],
}