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
    return resp.json({
      status: "Success",
      code: "200",
      data: buyResponse,
    });
  } catch (err) {
    return resp.json({
      status: "Error",
      statusCode: err.code ?? "500",
      data: err.msg ?? "Internal Server Error",
    });
  }
}
