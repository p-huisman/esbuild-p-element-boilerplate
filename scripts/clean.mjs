import fs from 'fs';
import path from 'path';
import {rimrafSync} from "rimraf";

export function clean(config) {
  const distDir = path.join(config.projectRootDir, config.dist);
  const typesDir = path.join(config.projectRootDir, "types");
  rimrafSync(distDir);
  rimrafSync(typesDir);
  fs.mkdirSync(distDir, {recursive: true});
  fs.mkdirSync(typesDir, {recursive: true});
}
