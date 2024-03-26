import postcss from "postcss";
import postcssConfig from "./postcss-config.mjs";
import fs from "fs";
import esbuild from "esbuild";
import { actionParam } from "./action.mjs";

export const CSSPlugin = {
  name: "CSSPlugin",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      return new Promise((resolve) => {
        let css = fs.readFileSync(args.path, "utf8");
        postcss(postcssConfig.plugins).process(css, { from: undefined }).then((result) => {
          esbuild.transform(result.css, {
            loader: "css",
            minify: actionParam === "build",
          })
            .then((result) => {
              resolve({ loader: "text", contents: result.code });
            });
        });
      });
    });
  },
};
