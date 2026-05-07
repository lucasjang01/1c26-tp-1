import express from "express";
import { init, getAccounts, getRates } from "./core/stateManager.js";
import * as accountController from "./controllers/accountController.js";
import * as rateController from "./controllers/rateController.js";
import * as logController from "./controllers/logController.js";
import * as exchangeController from "./controllers/exchangeController.js";

await init();

const app = express();
const port = 3000;

app.use(express.json());

app.get("/accounts", accountController.getAll);
app.put("/accounts/:id/balance", accountController.setBalance);

app.get("/rates", rateController.getAll);
app.put("/rates", rateController.setRate);

app.get("/log", logController.getAll);

app.post("/exchange", exchangeController.postExchange);

// Ping/Echo (Bass, Availability - Detect Faults)
app.get("/health", async (req, res) => {
  try {
    const accounts = await getAccounts();
    const rates = await getRates();
    const isReady = accounts !== undefined && rates !== undefined;

    res.status(isReady ? 200 : 503).json({
      status: isReady ? "ok" : "initializing",
    });
  } catch (err) {
    res.status(503).json({ status: "initializing" });
  }
});

app.listen(port, () => {
  console.log(`Exchange API listening on port ${port}`);
});

export default app;
