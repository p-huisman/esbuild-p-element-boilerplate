const {Buffer} = require("buffer");
const {createInstrumenter} = require("istanbul-lib-instrument");

const CoveragePlugin = {
  name: "code-coverage",
  setup(build) {
    let coverageInstrumenter = createInstrumenter({esModules: true});
    build.onEnd((result) => {
      const js = result.outputFiles.find((f) => f.path.match(/\.js$/));
      const sourceMap = result.outputFiles.find((f) =>
        f.path.match(/\.js\.map$/),
      );
      const sourceMapObject = JSON.parse(sourceMap.text);
      sourceMapObject.sourceRoot = "/";
      const instrumented = coverageInstrumenter.instrumentSync(
        js.text,
        null,
        sourceMapObject,
      );
      js.contents = Buffer.from(instrumented);
    });
  },
};
module.exports = CoveragePlugin;
