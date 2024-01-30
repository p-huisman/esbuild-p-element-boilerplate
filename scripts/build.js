const CSSPlugin = require("./css-plugin");
const isProduction = require("process").env.NODE_ENV === "production";
const createServer = require("http").createServer;
const express = require("express");
const serveIndex = require("serve-index");
const socketServer = require("esbuild-plugin-dev-server").socketServer;
const client = require("esbuild-plugin-dev-server").client;
const esbuild = require("esbuild");
function log(message) {
  console.log(
    `[${new Date().toISOString().split("T")[1].split("Z")[0]}] ${message}`,
  );
}

const buildOptions = {
  entryPoints: ["src/p-component.tsx"],
  bundle: true,
  target: "es6",
  outdir: "dist",
  sourcemap: true,
  plugins: [
    CSSPlugin,
  ],
  loader: {
    ".html": "text",
    ".svg": "text",
  },
};

if (isProduction) {
  buildOptions.minify = true;
  delete buildOptions.sourcemap;
  (async () => {
    log(`Start build`);
    await esbuild.build(buildOptions);
    log(`End build`);
  })();
} else {
  const serverOptions = {host: "localhost", port: 9000};
  buildOptions.banner = {js: client()};
  const app = express({strict: false});
  require("./api/index")(app);
  log(`Start dev server http://${serverOptions.host}:${serverOptions.port}`);
  app.use(express.static("./"), serveIndex("./", {icons: true}));
  const server = createServer(app);
  const write = socketServer(server);

  buildOptions.plugins.push({
    name: "build",
    setup: (build) => {
      build.onStart(() => {
        log("Build started");
      });
      build.onEnd((result) => {
        write(result);
        log("Build complete");
        [...result.errors, ...result.warnings].forEach((element) => {
          console.log(element);
        });
      });
    },
  });

  server.listen(serverOptions);
  (async () => {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
  })();
}
