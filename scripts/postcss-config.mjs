import postcssPresetEnv from "postcss-preset-env";
import cssnano from "cssnano";
export default {
  plugins: [
    postcssPresetEnv({ 
      grid: true 
    }),
    cssnano({
      preset: 'default',
    }),
  ],
}