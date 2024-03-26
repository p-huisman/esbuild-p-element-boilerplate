import fs from "fs";
import path from "path";
import process from "process";

const projectRootDir = process.cwd();
let config;
if (!config) {
  config = JSON.parse(
    fs.readFileSync(path.join(projectRootDir, "config.json")).toString(),
  );
  if (config.cssFiles) {
    config.cssFiles = config.cssFiles.map((file) => {
      return {
        src: path.join(projectRootDir, file.src),
        target: path.join(projectRootDir, config.dist, file.target),
      };
    });
  }
}

export const projectConfig = {
  projectRootDir,
  devServer: {
    port: 9000,
  },
  browsers: ["chromium"],
  ...config,
};
