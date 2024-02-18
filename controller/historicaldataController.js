import {
  filterHistoricalData,
  fetchNiftyMonthlyData,
  probOfNextMonthIncresingGivenPrevnIncrease,
  returnsForStrategyArray,
  generateStrategyDataAndcompareNifty,
  fetchDataAndImplementstopLossStrategyDaily,
} from "../handler/historicalDataHandler.js";
import { callApiToGetScriptDataInADateRange } from "../handler/apiContainer.js";

export async function getHistoricalMonthlyOHLCVData(req, res) {
  const instrument_key = "NSE_EQ|INE528G01035";
  const interval = "month";
  const to_date = "2023-12-03";
  const from_date = "2013-10-04";

  try {
    let response = await callApiToGetScriptDataInADateRange(
      instrument_key,
      interval,
      to_date,
      from_date
    );
    if (!response)
      throw {
        code: "502",
        msg: `Unable to fetch Data for script ${instrument_key}`,
      };
    const monthClosePositions = filterHistoricalData(response);
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
      status: "Success",
      statusCode: "200",
      data: monthClosePositions,
    });
  } catch (err) {
    console.log(err.response?.data ?? err);
    return res.json({
      status: "Error",
      statusCode: err.code ?? "500",
      data: err.msg ?? "Iternal Server Error",
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

export async function stopLossStrategy(req, res) {
  const response = await fetchDataAndImplementstopLossStrategyDaily();
  return res.json({ data: response });
}
