import {log} from "./log.mjs";
import postcss from "postcss";
import fs from "fs";
import process from "process";
import postcssConfig from "./postcss-config.mjs";

export function buildCssFile(config, src, target, broadcast) {
  return new Promise((resolve) => {
    log(`Process css ${src.replace(config.projectRootDir, "")} start`);
    fs.readFile(src, (err, css) => {
      if (err) {
        log(`error reading css file ${src} ${err.message}`, "error");
        process.exit(1);
      }
      postcss(postcssConfig.plugins)
        .process(css, {from: src, to: target})
        .then((result) => {
          fs.writeFileSync(target, result.css, () => true);
          if (broadcast) {
            broadcast(result);
          }
        })
        .catch((e) => {
          log(`Error processing css ${src.replace(config.projectRootDir, "")} ${e.message}`, "error");
          process.exit(1);
        })
        .finally(() => {
          log(`Process css ${src.replace(config.projectRootDir, "")} complete`);
          resolve();
        });
    });
  });
}

const watchFiles = [];

export async function buildCss(config, action, broadcast) {
  log("CSS build started");
  const cssFiles = config.cssFiles;
  const promises = [];
  cssFiles.forEach((file) => {
    const {src, target} = file;
    promises.push(buildCssFile(config, src, target, broadcast));
  });
  await Promise.all(promises).catch(e => e);
  if (action === "develop") {
    for (const file of cssFiles) {
      if (!watchFiles.includes(file.src)) {
        watchFiles.push(file.src);
        fs.watch(file.src, () => {
          buildCssFile(config, file.src, file.target, broadcast);
        });
      }
    }
  }
  log("CSS build complete");
}

