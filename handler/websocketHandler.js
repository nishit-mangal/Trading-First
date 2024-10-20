import { headers } from "../Constants/authorizationConst.js";
import protobuf from "protobufjs";
import axios from "axios";
import { WebSocket } from "ws";
import { wss } from "../index.js";

let protobufRoot = null;

export const initProtobuf = async () => {
  protobufRoot = await protobuf.load("./Constants/MarketDataFeed.proto");
  console.log("Protobuf part initialization complete");
};

export async function getMarketFeedUrl() {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "https://api.upstox.com/v2/feed/market-data-feed/authorize",
    headers: headers,
  };

  try {
    const response = await axios(config);
    return response.data.data.authorizedRedirectUri;
  } catch (error) {
    console.log("Errors in fn::getMarketFeedUrl", error.response.data ?? "");
    return null;
  }
}

export const connectWebSocket = async (wsUrl) => {
  return new Promise((resolve, reject) => {
    const ws1 = new WebSocket(wsUrl, {
      headers: headers,
      followRedirects: true,
    });

    // WebSocket event handlers
    ws1.on("open", () => {
      console.log("connected");
      // resolve(ws1); // Resolve the promise once connected

      /**
       * Set a timeout to send a subscription message after 1 second.
       *  This is to tell upstox what instruments the user wants to subscribe to.
       * If the instrumentKeys are dynamic then put something like setTimeout
       * */        
      const data = {
        guid: "somegud",
        method: "sub",
        data: {
          mode: "ltpc",
          instrumentKeys: ["NSE_EQ|INE002A01018", "NSE_INDEX|Nifty 50"],
        },
      };
      ws1.send(Buffer.from(JSON.stringify(data)));
      
    });

    ws1.on("close", () => {
      console.log("disconnected");
    });

    ws1.on("message", (data) => {
      let response = decodeProfobuf(data);
      console.log(response);
      console.log(
        Date(),
        "Bank Nifty: ",
        response.feeds["NSE_INDEX|Nifty 50"]?.ltpc.ltp
      );
      console.log(
        Date(),
        "Jio: ",
        response.feeds["NSE_EQ|INE002A01018"]?.ltpc.ltp
      );

      wss.clients.forEach((client) => {
        console.log("Server code");
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              instrument: "Nifty 50",
              price: response.feeds["NSE_INDEX|Nifty 50"]?.ltpc.ltp,
            })
          );

          client.send(
            JSON.stringify({
              instrument: "Jio",
              price: response.feeds["NSE_EQ|INE002A01018"]?.ltpc.ltp,
            })
          );
        }
      });

      resolve(decodeProfobuf(data));
    });

    ws1.on("error", (error) => {
      console.log("error:", error);
      reject(error); // Reject the promise on error
    });
  });
};

const decodeProfobuf = (buffer) => {
  if (!protobufRoot) {
    console.warn("Protobuf part not initialized yet!");
    return null;
  }

  const FeedResponse = protobufRoot.lookupType(
    "com.upstox.marketdatafeeder.rpc.proto.FeedResponse"
  );
  return FeedResponse.decode(buffer);
};
