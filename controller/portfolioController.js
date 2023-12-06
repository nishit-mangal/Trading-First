import axios from "axios";
import { headers } from "../Constants/authorizationConst.js";
import { sortHoldingData } from "../handler/portfolioHandler.js";

export async function getHoldings(req, res) {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "https://api.upstox.com/v2/portfolio/long-term-holdings",
    headers: headers,
  };
  try {
    const portfolio = await axios(config);
    console.log(portfolio.data.data)
    const processedHoldings = sortHoldingData(portfolio.data.data)
    return res.json({status:portfolio.data.status, data:processedHoldings})
  } catch (err) {
    console.log(err.response?.data ?? err);
    return res.json({status:"Error", message:err.response.data.errors[0].message ?? err})
  }
}
