import bodyParser from "body-parser";

const api = (app) => {
  app.use(bodyParser.json());

  app.get("/api/greet", (req, res) => {
    res.send({message: "hi"});
  });
}

export default api;
