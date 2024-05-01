
const api = (app) => {

  app.get("/api/greet", (req, res) => {
    res.send({message: "hi"});
  });
}

export default api;
