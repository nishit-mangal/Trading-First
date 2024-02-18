import axios from "axios";
import { headers } from "../Constants/authorizationConst.js";

export async function callApiToGetHoldings() {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "https://api.upstox.com/v2/portfolio/long-term-holdings",
    headers,
  };
  try {
    const portfolio = await axios(config);
    return portfolio.data.data;
  } catch (err) {
    console.log(err.response?.data ?? err);
    return null;
  }
}

export async function callApiToGetScriptDataInADateRange(
  instrument_key,
  interval,
  to_date,
  from_date
) {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://api-v2.upstox.com/historical-candle/${instrument_key}/${interval}/${to_date}/${from_date}`,
    headers: headers,
  };

  try {
    const historicalData = await axios(config);
    return historicalData.data.data.candles;
  } catch (err) {
    console.log(err.response?.data ?? err);
    return null;
  }
}

export async function callApiToGetFundAndMargin() {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "https://api.upstox.com/v2/user/get-funds-and-margin",
    headers: headers,
  };

  try {
    const funds = await axios(config);
    return funds.data.data;
  } catch (err) {
    console.log(err.response?.data ?? err);
    return null;
  }
}
