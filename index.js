import express from "express";
import { appAuthRouter } from "./routes/authorizationRoutes.js";
import { userRouter } from "./routes/userRoutes.js";
import { portfolioRouter } from "./routes/portfolioRoutes.js";
import { historicalDataRouter } from "./routes/historicalDataRoutes.js";
import path from 'path'
import { websocketRouter } from "./routes/websocketRoutes.js";
import { profitLossRouter } from "./routes/profitLossRouter.js";
import { orderRouter } from "./routes/orderRoutes.js";

const app = express();

const port = 8000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json())

app.set('view engine','ejs')
app.set('views', path.resolve('./views'))

app.use('/authorization', appAuthRouter)
app.use("/user", userRouter);
app.use('/portfolio', portfolioRouter)
app.use('/historicalData', historicalDataRouter)
app.use('/profitLoss', profitLossRouter)
app.use('/orders', orderRouter)


app.use('/webSocketConnection', websocketRouter)
// https://api.upstox.com/v2/login/authorization/dialog?client_id=6146dafc-cc80-4cb7-98c5-c667566fd9b3&redirect_uri=https://127.0.0.1&state=code
app.listen(port, () => console.log(`Listening on Port ${port}...`));
