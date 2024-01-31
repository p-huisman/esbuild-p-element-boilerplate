const path = require("path");
const bodyParser = require("body-parser");

module.exports = (app) => {
  app.use(bodyParser.json());

  app.get("/api/greet", (req, res) => {
    res.send({message: "hi"});
  });

};
