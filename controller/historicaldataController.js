import axios from "axios";
import { headers } from "../Constants/authorizationConst.js";
import {
  bestPerformingStockInAMonth,
  callApiToGetNiftyData,
  filterHistoricalData,
  mapCompanyMonthlyReturns,
  probOfNextMonthIncresingGivenPrevnIncrease,
  tradingStrategy,
} from "../handler/historicalDataHandler.js";
import { niftyArray } from "../Constants/niftyCompanies.js";

export async function getHistoricalMonthlyOHLCVData(req, res) {
  const instrument_key = "NSE_EQ|INE528G01035";
  const interval = "month";
  const to_date = "2023-11-03";
  const from_date = "2013-10-04";

  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://api-v2.upstox.com/historical-candle/${instrument_key}/${interval}/${to_date}/${from_date}`,
    headers: headers,
  };

  try {
    const historicalData = await axios(config);
    console.log(historicalData.data.data);
    const monthClosePositions = filterHistoricalData(
      historicalData.data.data.candles
    );
    // const probab1 = probOfNextMonthIncresingGivenPrevnIncrease(monthClosePositions, 1)
    // console.log("Probability with n=1: ", probab1)
    // const probab2 = probOfNextMonthIncresingGivenPrevnIncrease(monthClosePositions, 2)
    // console.log("Probability with n=2: ", probab2)
    const probab3 = probOfNextMonthIncresingGivenPrevnIncrease(
      monthClosePositions,
      7
    );
    console.log("Probability with n=3: ", probab3);
    return res.json({
      status: historicalData.data.status,
      data: monthClosePositions,
    });
  } catch (err) {
    console.log(err.response?.data ?? err);
    return res.json({
      status: "Error",
      message: err.response.data.errors[0].message ?? err,
    });
  }
}

export async function getHistoricalMonthlyOHLCVDataNifty(req, res) {
  let response =await callApiToGetNiftyData();
  if(!response){
    console.log("resp", response)
    return res.send("Error occured while fetching monthly data for nifty.")
  }

  let dataSelectingStocks = bestPerformingStockInAMonth(response)
  let mapOfCompanyReturns = mapCompanyMonthlyReturns(response)
  let arrayOfDataSelectingStocks = Array.from(dataSelectingStocks.entries()).reverse()
  // console.log("Array", arrayOfDataSelectingStocks)
  let portfolio = tradingStrategy(arrayOfDataSelectingStocks, mapOfCompanyReturns)
  let start = 100
  let i=1;
  for(let monthReturn of portfolio){
    
    monthReturn/=100
    let ret = 1+monthReturn
    start*=ret
    console.log(i,"Start: ", start, "Month Ret: ", monthReturn)
    i++
  }
  console.log("Return", start)
  return res.json({data:"Done"});
}
