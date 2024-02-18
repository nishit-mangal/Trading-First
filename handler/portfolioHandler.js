export function sortHoldingData(holdingArr) {
  let filteredArr = [];
  for (let stock of holdingArr) {
    let tempStockObj = {
      companyName: stock.company_name,
      tradingSymbol: stock.trading_symbol,
      profit: stock.pnl,
      quantity: stock.quantity,
      averagePrice: stock.average_price,
      closingPrice: stock.close_price,
      instrumentToken: stock.instrument_token,
    };
    filteredArr.push(tempStockObj);
  }
  return filteredArr;
}

/**
 * @param data[][]
 * @returns integer
 */
export function get1YearHighForAStock(data) {
  if (!data || data.length == 0) {
    return null;
  }
  let oneYearHigh = Number.MIN_SAFE_INTEGER
  for(let i=0; i<data.length; i++){
    let ohlcv = data[i]
    if(ohlcv[4] > oneYearHigh){
      oneYearHigh = ohlcv[4]
    }
  }

  return oneYearHigh
}
