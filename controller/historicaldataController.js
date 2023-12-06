import axios from "axios";
import { headers } from "../Constants/authorizationConst.js";

export async function getHistoricalMonthlyOHLCVData(req, res) {
    
    const instrument_key = "NSE_EQ|INE002A01018";
    const interval= 'month'
    const to_date= "2023-09-03"
    const from_date = "2013-10-04"

  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://api-v2.upstox.com/historical-candle/${instrument_key}/${interval}/${to_date}/${from_date}`,
    headers: headers
  };

  try {
    const historicalData = await axios(config);
    console.log(historicalData.data);
    return res.json({ status: historicalData.data.status, data: historicalData.data.data });
  } catch (err) {
    console.log(err.response?.data ?? err);
    return res.json({
      status: "Error",
      message: err.response.data.errors[0].message ?? err,
    });
  }
}
