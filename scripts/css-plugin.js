const esbuild = require("esbuild");
const process = require("process");
const {readFile} = require("fs/promises");
const postcss = require("postcss");
const isProduction = process.env.NODE_ENV === "production";
const minify = isProduction;

const CSSPlugin = {
  name: "CSSPlugin",
  setup(build) {
    build.onLoad({filter: /\.css$/}, async (args) => {
      let css = await readFile(args.path);
      const postcssResult = await postcss([
        require("postcss-preset-env")({
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

module.exports = CSSPlugin;
