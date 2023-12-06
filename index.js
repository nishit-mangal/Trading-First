import express from "express";
import axios from "axios";
import { apiKey, apiSecret, baseUrl, code, redirect_uri } from "./Constants/authorizationConst.js";
import { appAuthRouter } from "./routes/authorizationRoutes.js";
import { userRouter } from "./routes/userRoutes.js";
import { getHoldings } from "./controller/portfolioController.js";
import { portfolioRouter } from "./routes/portfolioRoutes.js";
import { hostoricalDataRouter } from "./routes/historicalDataRoutes.js";

const app = express();

const port = 8000;

app.use(express.urlencoded({ extended: false }));

app.use('/authorization', appAuthRouter)
app.use("/user", userRouter);
app.use('/portfolio', portfolioRouter)
app.use('/historicalData', hostoricalDataRouter)

// https://api.upstox.com/v2/login/authorization/dialog?client_id=6146dafc-cc80-4cb7-98c5-c667566fd9b3&redirect_uri=https://127.0.0.1&state=code
app.listen(port, () => console.log(`Listening on Port ${port}...`));
