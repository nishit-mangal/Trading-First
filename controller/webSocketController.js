import { connectWebSocket, getMarketFeedUrl, initProtobuf } from "../handler/websocketHandler.js";

export async function connectToWebsocket(req, res) {
  try {
    await initProtobuf(); // Initialize protobuf
    const wsUrl = await getMarketFeedUrl(); // Get the market feed URL
    if(!wsUrl)
      throw 'URL not generated to connect Websocket'
    console.log("URL generated Successfully", wsUrl);
    const wsS = await connectWebSocket(wsUrl); // Connect to the WebSocket
    return res.send(wsS)
  } catch (error) {
    console.error(error);
    return res.json({msg:error})
  }
}
