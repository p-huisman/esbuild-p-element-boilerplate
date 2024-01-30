// Karma configuration
const process = require("process");
const CSSPlugin = require("./scripts/css-plugin");
const CoveragePlugin = require("./scripts/coverage");
const singleRun = process.argv.indexOf("--single-run") > -1;

module.exports = function (config) {
  config.set({
    client: {
      clearContext: false,
      jasmine: {
        random: false,
      },
    },

    basePath: "",

    frameworks: ["jasmine"],

    files: [
      "node_modules/p-elements-core/dist/p-elements-core-modern.js",
      {pattern: "src/**/*.spec.tsx", watched: false},
    ],

    exclude: [],

    preprocessors: {
      "src/**/*.{tsx,ts}": ["esbuild"],
    },

    plugins: [
      "karma-esbuild-up",
      "karma-jasmine",
      "karma-coverage",
      "karma-junit-reporter",
      "@chiragrupani/karma-chromium-edge-launcher",
    ],

    esbuild: {
      publicPath: ".",
      sourcemap: "inline",
      plugins: singleRun ? [CoveragePlugin, CSSPlugin] : [CSSPlugin],
    },

    reporters: singleRun ? ["progress", "junit", "coverage"] : [],

    coverageReporter: {
      reporters: [
        {type: "cobertura", subdir: "."},
        {type: "lcov", subdir: "."},
      ],
      instrumenterOptions: {
        istanbul: {noCompact: true},
      },
    },

    junitReporter: {
      outputFile: "TESTS-junit_karma.xml",
      useBrowserName: false,
    },

    port: 9876,

    colors: true,

    logLevel: config.LOG_INFO,

    browsers: ["Edge"],

    concurrency: Infinity,
  });
};
