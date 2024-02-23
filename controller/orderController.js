import { tradeStockByModifyingReq } from "../handler/orderHandler.js";

export async function buyStock(req, resp) {
  try {
    let reqObj = req.body;
    if (
      !reqObj ||
      !reqObj.quantity ||
      !reqObj.instrument_token ||
      !reqObj.transaction_type
    ) {
      throw { code: "400", msg: "Invalid Input" };
    }
    let buyResponse = await tradeStockByModifyingReq(reqObj);
    if(!buyResponse)
      throw { code: "502", msg: "Unable to process Order." };
    // let buyResponse = {
    //   order_id: "240219000660730",
    //   status: "complete",
    // };
    return resp.json({
      status: "Success",
      statusCode: "200",
      data: buyResponse,
    });
  } catch (err) {
    console.log(err.msg ?? err);
    return resp.json({
      status: "Error",
      statusCode: err.code ?? "500",
      data: err.msg ?? "Internal Server Error",
    });
  }
}
