import { HttpCode, pageSize } from "../Constants/constants.js";
import {
  callApiToBuyStocks,
  callApiToCheckOrderStatus,
} from "./apiContainer.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function tradeStockByModifyingReq(req) {
  //   console.log("req in buyStockByModifyingReq", req);
  /*{
  "quantity": 1,
  "product": "D",
  "validity": "DAY",
  "price": 0,
  "tag": "string",
  "instrument_token": "NSE_EQ|INE848E01016",
  "order_type": "MARKET",
  "transaction_type": "BUY",
  "disclosed_quantity": 0,
  "trigger_price": 0,
  "is_amo": false
}*/
  try {
    req["product"] = "D";
    req["validity"] = "DAY";
    req["order_type"] = "MARKET";
    req["disclosed_quantity"] = req.quantity;
    req["trigger_price"] = 0;
    req["is_amo"] = false;

    /**
     * buyResponse = { order_id: '240219000611411' }
     */
    let buyResponse = await callApiToBuyStocks(req);
    if (!buyResponse) throw { code: HttpCode.BAD_GATEWAY, msg: "Unable to process Order." };

    //checkStatus of order
    let status = await checkOrderStatus(buyResponse.order_id)
    // let status = await checkOrderStatus("240219000611411");
    buyResponse.status = status ?? null;
    return buyResponse;
  } catch (err) {
    console.log(err.msg ?? err);
    return null;
  }
}

async function checkOrderStatus(orderId) {
  if (!orderId) return null;

  /**
   * statusArr = [{}, {}]
   */
  let statusArr = await callApiToCheckOrderStatus(orderId);
  if (!statusArr || statusArr.length == 0) {
  console.log("Can not get Status Array. Unable to get stauts of ", orderId);
  return null;
  }

  /**
   * latestStatus = {
   * quantity: 1,
   * status: 'validation pending',
   * }
   */
  let latestStatus = statusArr[statusArr.length - 1];
  putDatainDB(latestStatus);
  return latestStatus?.status;
}

/**
 *
 * @param {number} pageNumber
 * @returns {Promise<[]>}
 */
export async function fetchData(pageNumber) {
  try {
    let response = await prisma.order.findMany({
      orderBy: [
        {
          order_timestamp: "desc",
        },
        { id: "desc" },
      ],
      take: pageSize,
      skip: (pageNumber - 1) * pageSize,
    });
    // console.log(response);
    return response;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function putDatainDB(latestStatus) {
  try {
    const result = await prisma.order.create({
      data: {
        order_id: latestStatus.order_id,
        trading_symbol: latestStatus.trading_symbol,
        quantity: latestStatus.quantity,
        average_price: latestStatus.average_price,
        status: latestStatus.status,
        order_type: latestStatus.order_type,
        validity: latestStatus.validity,
        order_timestamp: new Date(latestStatus.order_timestamp),
      },
    });
    // console.log(result);
  } catch (err) {
    console.log("Error Occured for:\n", latestStatus);
    console.log(err);
  }
}
