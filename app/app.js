import express from "express";
import { init } from "./core/stateManager.js";
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

app.listen(port, () => {
  console.log(`Exchange API listening on port ${port}`);
});

export default app;
