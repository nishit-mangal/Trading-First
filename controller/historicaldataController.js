import axios from "axios";
import { headers } from "../Constants/authorizationConst.js";
import {
  filterHistoricalData,
  fetchNiftyMonthlyData,
  probOfNextMonthIncresingGivenPrevnIncrease,
  returnsForStrategyArray,
  generateStrategyDataAndcompareNifty,
} from "../handler/historicalDataHandler.js";

export async function getHistoricalMonthlyOHLCVData(req, res) {
  const instrument_key = "NSE_EQ|INE528G01035";
  const interval = "month";
  const to_date = "2023-12-03";
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
  const returnArray = await returnsForStrategyArray();
  return res.json({ data: returnArray });
}

export async function getNifty50IndexData(req, res) {
  const response = await fetchNiftyMonthlyData();
  return res.json({ data: response });
}

export async function compareNiftyWithStrategy(req, res) {
  const strategyData = await generateStrategyDataAndcompareNifty();
  // console.log("Response", strategyData);
  return res.render("graphs", {
    data: strategyData,
  });
}
