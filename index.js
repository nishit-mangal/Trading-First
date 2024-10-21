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
import { clientSubscriptionInstance } from "./Utility/classes.js";
import { subscribeToTicker } from "./handler/websocketHandler.js";

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
let serverHttp = app.listen(port, () => console.log(`Listening on Port ${port}...`));

export const wss = new WebSocketServer({server: serverHttp});

wss.on("connection", (client) => {
    console.log("Frontend client connected");
    
    try {
        client.on("message", async (message) => {
            console.log("Received message from frontend:", message.toString());
            
            if(message.toString().includes("SUBSCRIBE")){
                clientSubscriptionInstance.clientSubscribesToTicker(message.toString().split(" ")[1], client);
                console.log(clientSubscriptionInstance.getArrayOfActiveTickers());
                await subscribeToTicker();
            }
        });

        client.on("close", (client) => {
            console.log("Frontend client disconnected", client);
        });
    } catch(err){
        console.log(err ?? "Error occured while establishig websocket connection");
    }
});