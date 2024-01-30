const path = require("path");
const bodyParser = require("body-parser");

module.exports = (app) => {
  app.use(bodyParser.json());

  app.get("/particulieren/mijnpfzw/callback.html", (req, res) => {
    res.send(`<html>
      <body>
      <script src="/particulieren/mijnpfzw/callback.js"></script>
      <script defer src="/node_modules/p-elements-core/dist/p-elements-core-modern.js"></script>
      <p-ajax>
        <p-auth-code-flow
          id="AuthParticulier"
          discovery-url="https://app-pggm-pggm-onewelcome-deelnemers-pfzw-tstsvr-o.pggm-ase-team7-shared-ase-o.appserviceenvironment.net/.well-known/openid-configuration"
          client-id="particulier"
          scope="openid profile"
          callback-path="/particulieren/mijnpfzw/callback.html"
          url-pattern="https://services-kvta.team_7.o.pggm-intra.intern"
          t7-url-pattern="https://services.Team_7.o.pggm-intra.intern/MijnOmgeving"
          storage="session"
          storage-key="p-auth-token"
          consulenten-fonds-url="https://pggm-test65.adobecqms.net/particulieren/mijnpfzw/consulent/consulent.html"
        ></p-auth-code-flow>
      </p-ajax>
      <script defer src="/node_modules/@pggm/p-ajax/dist/p-ajax.js"></script>
      </body>
      </html>
      `);
  });

  app.get("/particulieren/mijnpfzw/callback.js", (req, res) => {
    res.sendFile(path.join(__dirname, "/callback.js"));
  });

  // app.post("/api/bvw-verlof", (req, res) => {
  //   res.send({message: "success"});
  // });

};
