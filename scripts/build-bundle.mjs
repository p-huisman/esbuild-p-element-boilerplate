import path from "path";
import esbuild from "esbuild";
import {log} from "./log.mjs";
import {CSSPlugin} from "./css-plugin.mjs";

export async function buildBundle(config, action, broadcast) {
  let isResolved = false;
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  let entryPoints =
    action === "build" || action === "develop"
      ? config.entryPoints.map((entry) =>
          path.join(config.projectRootDir, entry),
        )
      : config.testEntryPoints.map((entry) =>
          path.join(config.projectRootDir, entry),
        );
  if (action === "testdevelop") {
    const devEntrypoints = config.entryPoints.map((entry) =>
      path.join(config.projectRootDir, entry),
    );
    entryPoints = [...entryPoints, ...devEntrypoints];
  }

  const buildPlugin = {
    name: "build",
    setup: (build) => {
      build.onStart(() => {
        log("Build started");
      });
      build.onEnd((result) => {
        if (broadcast) {
          broadcast(result ? result : {});
        }
        log("Build complete");
        [...result.errors, ...result.warnings].forEach((element) => {
          log(element, "error");
        });
        if (isResolved) {
          return;
        }
        isResolved = true;
        resolve();
      });
    },
  };

  const sourcemap = action === "develop" ?  "external" : "inline";

  const buildOptions = {
    entryPoints,
    bundle: true,
    minify: action === "build",
    sourcemap: action === "build" ? false : sourcemap,
    outdir: path.join(config.projectRootDir, config.dist),
    plugins: [CSSPlugin, buildPlugin],
    loader: {
      ".html": "text",
      ".svg": "text",
    },
  };

  if (action === "develop" || action === "testdevelop") {
    const ctx = await esbuild.context(buildOptions);
    ctx.watch();
    return promise;
  }
  return esbuild.build(buildOptions);

}
