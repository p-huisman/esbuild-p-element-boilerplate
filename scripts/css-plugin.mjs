import postcss from "postcss";
import postcssPresetEnv from "postcss-preset-env";
import {readFile} from "fs/promises";
import esbuild from "esbuild";
import process from "process";

const minify = process.env.NODE_ENV === "production";

export const CSSPlugin = {
  name: "CSSPlugin",
  setup(build) {
    build.onLoad({filter: /\.css$/}, async (args) => {
      let css = await readFile(args.path);
      const postcssResult = await postcss([
        postcssPresetEnv({
          grid: true,
        }),
      ]).process(css, {from: undefined}).css;
      css = await esbuild.transform(postcssResult, {
        loader: "css",
        minify,
      });
      return {loader: "text", contents: css.code};
    });
  },
};
