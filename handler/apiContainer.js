import axios from "axios";
import { accessToken, code, headers } from "../Constants/authorizationConst.js";
import {} from 'dotenv/config'

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

export async function callApiToBuyStocks(data) {
  headers["Content-Type"] = "application/json";
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.upstox.com/v2/order/place",
    headers: headers,
    data,
  };
  try {
    const buyResponse = await axios(config);
    // console.log(buyResponse.data.data);
    return buyResponse.data.data;
  } catch (err) {
    console.log(err.response?.data ?? err);
    return null;
  }
}

export async function callApiToCheckOrderStatus(orderId) {
  let params = {
    order_id: orderId,
  };
  headers["Content-Type"] = "application/json";
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "https://api.upstox.com/v2/order/history",
    headers: headers,
    params,
  };
  try {
    const orderHistory = await axios(config);
    // console.log(orderHistory.data.data);
    return orderHistory.data.data;
  } catch (err) {
    console.log(err.response?.data ?? err);
    return null;
  }
}

export async function callApiToGenerateAccessToken() {
  const headers = {
    accept: "application/json",
    "Api-Version": "2.0",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const data = {
    code,
    client_id: process.env.API_KEY,
    client_secret: process.env.API_SECRET,
    redirect_uri: process.env.REDIRECT_URI,
    grant_type: "authorization_code",
  };
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${process.env.BASE_URL}/login/authorization/token`,
    headers: headers,
    data,
  };
  try{
    const response = await axios(config)
    // console.log(response.data);
    console.log("\nAccess Token before: ", accessToken)
    return response.data.access_token
  }catch(err){
    console.log(err.response?.data ?? err);
    return null;
  }
}
