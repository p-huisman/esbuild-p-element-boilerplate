import postcssPresetEnv from "postcss-preset-env";
import cssnano from "cssnano";
import { actionParam } from "./action.mjs";

const plugins = [
  postcssPresetEnv({grid: true}),
];
if (actionParam === "build") {
  plugins.push(cssnano({preset: 'default'}));
}
export default {
  plugins: [...plugins],
}