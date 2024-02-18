export async function buyStock(req, resp) {
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
    let reqObj = req.body;
    if (!reqObj || !reqObj.quantity || !reqObj.instrument_token || !reqObj.transaction_type){
        throw { code: "400", msg: "Invalid Input" }; 
    } 
    
    resp.json({ status: "Success", code: "400", data: "Order Placed Successfully" });

  } catch (err) {
    return resp.json({
        status: "Error",
        statusCode: err.code ?? "500",
        data: err.msg ?? "Internal Server Error",
      });
  }
}
