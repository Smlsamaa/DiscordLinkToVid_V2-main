const express = require("express");

function startServer(client) {
  const app = express();
  const port = process.env.PORT || 3000;

  app.get("/", (req, res) => {
    res.json({
      status: "ok",
      discord: client.isReady() ? "connected" : "connecting",
    });
  });

  app.get("/health", (req, res) => {
    res.sendStatus(client.isReady() ? 200 : 503);
  });

  return app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
  });
}

module.exports = { startServer };
