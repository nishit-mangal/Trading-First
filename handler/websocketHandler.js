import { headers } from "../Constants/authorizationConst.js";
import protobuf from "protobufjs";
import axios from "axios";
import { WebSocket } from "ws";
import { clientSubscriptionInstance } from "../Utility/clientSubscriptionClass.js";

let protobufRoot = null;
export let ws1 = null;
export const initProtobuf = async () => {
  protobufRoot = await protobuf.load("./Constants/MarketDataFeed.proto");
  console.log("Protobuf part initialization complete");
};

export async function getMarketFeedUrl(token) {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "https://api.upstox.com/v2/feed/market-data-feed/authorize",
    headers: {...headers, "Authorization": `Bearer ${token}`},
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
  if(ws1)
    return ("Already connected to Upstox")
  
  return new Promise((resolve, reject) => {
    ws1 = new WebSocket(wsUrl, {
      headers: headers,
      followRedirects: true,
    });

    // WebSocket event handlers
    ws1.on("open", async () => {
      console.log("connected");
      await subscribeToTicker();
      // resolve(ws1); // Resolve the promise once connected      
    });

    ws1.on("close", () => {
      console.log("disconnected");
    });

    ws1.on("message", (data) => {
      let response = decodeProfobuf(data);      
      
      for(const key in response.feeds){
        console.log(key, response.feeds[key]?.ltpc.ltp)
        clientSubscriptionInstance.getClientsFromTicker(key).forEach((c)=>{
          if(c.readyState === WebSocket.OPEN)
            c.send(response.feeds[key]?.ltpc.ltp)
          // TODO: else if the client is closed try deleting it. Try using worker threads.
          //or try using event emitter
        })
      }

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

// Function to subscribe to a ticker symbol via the Upstox WebSocket
export const subscribeToTicker = async (token) => {
  if(!ws1 || !ws1.readyState === WebSocket.OPEN){
    console.log("A new connection was built with the client but no connection exist with Upstox. \nMaking Upstox Connection")
    
    await initProtobuf(); // Initialize protobuf
    
    const wsUrl = await getMarketFeedUrl(token); // Get the market feed URL
    if(!wsUrl)
      throw 'URL not generated to connect Websocket'
    
    console.log("URL generated Successfully", wsUrl);    
    await connectWebSocket(wsUrl); // Connect to the WebSocket   
    return;   
  }
  console.log("The new subscription Array is", clientSubscriptionInstance.getArrayOfActiveTickers())
  const data = {
    guid: "somegud",
    method: "sub",
    data: {
      mode: "ltpc",
      instrumentKeys: clientSubscriptionInstance.getArrayOfActiveTickers(), // Subscribe to the ticker symbol
    },
  }
  ws1.send(Buffer.from(JSON.stringify(data)));    
};

export const unsubscribeToTicker = (unsubscribeArr) => {
  console.log("\nInside fn::unsubscribeToTicker. Unsubscribing from: ", unsubscribeArr);
  
  if(!ws1 || !ws1.readyState === WebSocket.OPEN){
    console.log("No connection exist with Upstox. Can not UNSUBSCRIBE.\n");
    return;
  }

  if(!unsubscribeArr || !unsubscribeArr.length){
    console.log("No Relevant Unsubscribe Array exist.");
    return;
  }

  const unsubscribeMessage = {
    guid: "somegud",
    method: "unsub",
    data: {
      mode: "ltpc",
      instrumentKeys: unsubscribeArr, // Unsubscribe from old tickers
    },
  };
  ws1.send(Buffer.from(JSON.stringify(unsubscribeMessage)));
}