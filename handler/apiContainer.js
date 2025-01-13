import axios from "axios";
import { accessToken, headers } from "../Constants/authorizationConst.js";
import {} from 'dotenv/config'

export async function callApiToGetHoldings(accessToken) {
  if(accessToken)
    headers["Authorization"] = accessToken;

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
    headers
  };

  try {
    const historicalData = await axios(config);
    return historicalData.data.data.candles;
  } catch (err) {
    console.log(err.response?.data ?? err);
    return null;
  }
}

export async function callApiToGetFundAndMargin(accessToken) {
  if(accessToken)
    headers["Authorization"] = accessToken;

  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "https://api.upstox.com/v2/user/get-funds-and-margin",
    headers
  };

  try {
    const funds = await axios(config);
    return funds.data.data;
  } catch (err) {
    console.log(err.response?.data ?? err);
    return null;
  }
}

export async function callApiToBuyStocks(data, accessToken) {
  if(accessToken)
    headers["Authorization"] = accessToken;
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

export async function callApiToCheckOrderStatus(orderId, accessToken) {
  if(accessToken)
    headers["Authorization"] = accessToken;
  headers["Content-Type"] = "application/json";
  let params = {
    order_id: orderId,
  };
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

export async function callApiToGenerateAccessToken(recivedCode, apiSecret, apiKey) {
  const headers = {
    accept: "application/json",
    "Api-Version": "2.0",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const data = {
    code:recivedCode,
    client_id: apiKey,
    client_secret: apiSecret,
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
