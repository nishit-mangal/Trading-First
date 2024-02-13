import { WebSocket } from "ws";
import protobuf from "protobufjs";
import axios from "axios";
import { headers } from "../Constants/authorizationConst.js";

// const WebSocket = ws.WebSocketServer;

let protobufRoot = null;

const initProtobuf = async () => {
  protobufRoot = await protobuf.load("./Constants/MarketDataFeed.proto");
  console.log("Protobuf part initialization complete");
};

async function getMarketFeedUrl() {
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
    console.log("Errors", error.response.data);
  }
}

const connectWebSocket = async (wsUrl) => {
  return new Promise((resolve, reject) => {
    const ws1 = new WebSocket(wsUrl, {
      headers: headers,
      followRedirects: true,
    });

    // WebSocket event handlers
    ws1.on("open", () => {
      console.log("connected");
    //   resolve(ws1); // Resolve the promise once connected

      // Set a timeout to send a subscription message after 1 second
      setTimeout(() => {
        const data = {
          guid: "somegud",
          method: "sub",
          data: {
            mode: "ltpc",
            instrumentKeys: ["NSE_INDEX|Nifty Bank", "NSE_INDEX|Nifty 50"],
          },
        };
        ws1.send(Buffer.from(JSON.stringify(data)));
      }, 1000);
    });

    ws1.on("close", () => {
      console.log("disconnected");
    });

    ws1.on("message", (data) => {
      // console.log(JSON.stringify(decodeProfobuf(data))); // Decode the protobuf message on receiving it
      let response = decodeProfobuf(data)
      // console.log(response.feeds["NSE_INDEX|Nifty Bank"].ltpc)
      // let bankNiftyFeed = response.feeds["NSE_INDEX|Nifty Bank"]
      console.log("\nBank Nifty: ", response.feeds["NSE_INDEX|Nifty Bank"]?.ltpc.ltp)
      console.log("Nifty 50: ", response.feeds["NSE_INDEX|Nifty 50"]?.ltpc.ltp)
      resolve(decodeProfobuf(data))
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

export async function connectToWebsocket(req, res) {
  try {
    await initProtobuf(); // Initialize protobuf
    const wsUrl = await getMarketFeedUrl(); // Get the market feed URL
    console.log("URL generated Successfully", wsUrl);
    const wsS = await connectWebSocket(wsUrl); // Connect to the WebSocket
    return res.send(wsS)
  } catch (error) {
    console.error("An error occurred:", error);
  }
}
