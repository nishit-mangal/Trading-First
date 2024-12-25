import { client } from "../Clients/clients.js";
import { CACHE_NAMES } from "../Constants/constants.js";

export async function sortHoldingData(holdingArr) {
  let filteredArr = [];
  for (let stock of holdingArr) {
    let tempStockObj = {};

    //check if the stock data exists in cache
    let isDataInCache = await client.exists(
      `${CACHE_NAMES.STOCK.NAME}:${stock.company_name}`
    );

    //if exists, set tempStock Obj to that
    if (isDataInCache == 1) {
      console.log(`Cache Hit for ${CACHE_NAMES.STOCK.NAME}:${stock.company_name}`);
      let cacheData = await client.get(
        `${CACHE_NAMES.STOCK.NAME}:${stock.company_name}`
      );
      tempStockObj = JSON.parse(cacheData);
    } else {
      //else update from the fetched data
      tempStockObj = {
        companyName: stock.company_name,
        tradingSymbol: stock.trading_symbol,
        profit: stock.pnl,
        quantity: stock.quantity,
        averagePrice: stock.average_price,
        closingPrice: stock.close_price,
        instrumentToken: stock.instrument_token,
      };
    }

    filteredArr.push(tempStockObj);
    // await client.lpush(CACHE_NAMES.PORTFOLIO_HOLDINGS.NAME, JSON.stringify(tempStockObj), ()=>console.log(`${CACHE_NAMES.PORTFOLIO_HOLDINGS.NAME} details set in Cache`))
  }
  // await client.expire(CACHE_NAMES.PORTFOLIO_HOLDINGS.NAME, CACHE_NAMES.PORTFOLIO_HOLDINGS.TTL)
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
  let oneYearHigh = Number.MIN_SAFE_INTEGER;
  for (let i = 0; i < data.length; i++) {
    let ohlcv = data[i];
    if (ohlcv[4] > oneYearHigh) {
      oneYearHigh = ohlcv[4];
    }
  }

  return oneYearHigh;
}
