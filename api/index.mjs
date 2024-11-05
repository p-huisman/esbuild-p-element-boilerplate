
const api = (app) => {

  app.get("/api/greet", (req, res) => {
    res.send({message: "Hi"});
  });
}

export default api;
