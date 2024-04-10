
/**
 * Use this middleware to create an API endpoint
 * if you need to parse the request body, you can use the body-parser middleware
 * @example
 * import bodyParser from "body-parser";
 * const api = (app) => {
 *  app.use(bodyParser.json());
 *  app.post("/api/greet", (req, res) => {
 *   res.send({message: `hi ${req.body.name}`});
 *  });
 * }
 *
 * In the browser you can use fetch to send a POST request to the API
 * @example
 *  fetch("/api/greet", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({name: "Peter"})})
 *
 *
 * @param {Express} app - Express app
*/

const api = (app) => {

  // Add your API endpoints here
  app.get("/api/greet", (req, res) => {
    res.send({message: "hi"});
  });
}

export default api;

