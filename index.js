import express from "express";
import cors from 'cors'
import { appAuthRouter } from "./routes/authorizationRoutes.js";
import { userRouter } from "./routes/userRoutes.js";
import { portfolioRouter } from "./routes/portfolioRoutes.js";
import { historicalDataRouter } from "./routes/historicalDataRoutes.js";
import path from 'path'
import { websocketRouter } from "./routes/websocketRoutes.js";
import { profitLossRouter } from "./routes/profitLossRouter.js";
import { orderRouter } from "./routes/orderRoutes.js";
import {} from  'dotenv/config'

const app = express();

const port = process.env.PORT ?? 8000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json())
app.use(cors())

app.set('view engine','ejs')
app.set('views', path.resolve('./views'))

app.use('/authorization', appAuthRouter)
app.use("/user", userRouter);
app.use('/portfolio', portfolioRouter)
app.use('/historicalData', historicalDataRouter)
app.use('/profitLoss', profitLossRouter)
app.use('/orders', orderRouter)


app.use('/webSocketConnection', websocketRouter)
app.listen(port, () => console.log(`Listening on Port ${port}...`));
