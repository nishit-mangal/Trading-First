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
import { WebSocketServer } from "ws";
import { clientSubscriptionInstance } from "./Utility/clientSubscriptionClass.js";
import cookieParser from "cookie-parser";
 

const app = express();

const port = process.env.PORT ?? 8000;
const protocol = process.env.ENVIRONMENT === "PROD" ? "https" : "http"
        
app.use(express.urlencoded({ extended: false }));
app.use(express.json())
app.use(cors({ origin: [
    "http://localhost:5173",
    "https://nishit.online",
    "https://finance.nishit.online"
], credentials: true }))
app.use(cookieParser());

app.set('view engine','ejs')
app.set('views', path.resolve('./views'))

app.use('/authorization', appAuthRouter)
app.use("/user", userRouter);
app.use('/portfolio', portfolioRouter)
app.use('/historicalData', historicalDataRouter)
app.use('/profitLoss', profitLossRouter)
app.use('/orders', orderRouter)

app.use('/webSocketConnection', websocketRouter)
let serverHttp = app.listen(port, () => console.log(`Listening on Port ${port}...`));

export const wss = new WebSocketServer({server: serverHttp});

wss.on("connection", (client, req) => {
    try {
        console.log("Frontend client connected");
        const requestUrl = new URL(req.url, `${protocol}://${req.headers.host}`);
        
        const token = requestUrl.searchParams.get("token");
        const userId = requestUrl.searchParams.get("userId");
        
        clientSubscriptionInstance.updateClientForUser(userId, client);
        client.on("message", async (message) => {
            console.log("\nReceived message from frontend:", message.toString());
            const splitMsg = message.toString().split(" ");
            if(splitMsg[0]==="SUBSCRIBE")
                await clientSubscriptionInstance.clientSubscribesToTicker(splitMsg[1], userId, token);
            
            console.log("Active tickers:", clientSubscriptionInstance.getArrayOfActiveTickers());            
        });

        client.on("close", (client) => {
            console.log("Frontend client disconnected", client);
        });
    } catch(err){
        console.log(err ?? "Error occured while establishig websocket connection");
    }
});