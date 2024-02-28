import { HttpCode } from "../Constants/constants.js";
import { fetchData, tradeStockByModifyingReq } from "../handler/orderHandler.js";

export async function buyStock(req, resp) {
  try {
    let reqObj = req.body;
    if (
      !reqObj ||
      !reqObj.quantity ||
      !reqObj.instrument_token ||
      !reqObj.transaction_type
    ) {
      throw { code: HttpCode.BAD_REQUEST, msg: "Invalid Input" };
    }
    let buyResponse = await tradeStockByModifyingReq(reqObj);
    if (!buyResponse)
      throw { code: HttpCode.BAD_GATEWAY, msg: "Unable to process Order." };
    // let buyResponse = {
    //   order_id: "240219000660730",
    //   status: "complete",
    // };
    return resp.json({
      status: "Success",
      statusCode: HttpCode.SUCCESS,
      data: buyResponse,
    });
  } catch (err) {
    console.log(err.msg ?? err);
    return resp.json({
      status: "Error",
      statusCode: err.code ?? HttpCode.INTERNAL_SERVER_ERROR,
      data: err.msg ?? "Internal Server Error",
    });
  }
}

export async function generateOrderHistory(req, resp) {
  try {
    let pageNo = parseInt(req.params.pageNumber);
    if (!pageNo) throw { code: HttpCode.BAD_REQUEST, msg: "Invalid Input" };

    let response = await fetchData(pageNo);
    if (!response)
      throw { code: HttpCode.BAD_GATEWAY, msg: "Unable to fetch orders." };

    return resp.json({
      status: "Success",
      statusCode: HttpCode.SUCCESS,
      data: response,
    });
  } catch (err) {
    console.log(err.msg ?? err);
    return resp.json({
      status: "Error",
      statusCode: err.code ?? HttpCode.INTERNAL_SERVER_ERROR,
      data: err.msg ?? "Internal Server Error",
    });
  }
}
