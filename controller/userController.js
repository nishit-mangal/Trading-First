import axios from "axios";
import { accessToken } from "../Constants/authorizationConst.js";
import { callApiToGetFundAndMargin } from "../handler/apiContainer.js";
import { client } from "../Clients/clients.js";
import { CACHE_NAMES, HttpCode } from "../Constants/constants.js";

export async function getUserProfile(req, res) {
  const headers = {
    accept: "application/json",
    "Api-Version": "2.0",
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Bearer ${accessToken}`,
  };

  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "https://api.upstox.com/v2/user/profile",
    headers: headers,
  };

  try {
    const userData = await axios(config);
    console.log(userData.data);
    return res.json({ status: userData.data.status, data: userData.data.data });
  } catch (err) {
    console.log(err.response.data);
    return res.json({
      status: "Error",
      message: err.response.data.errors[0].message,
    });
  }
}

export async function getFundDetails(req, res) {  
  try {
    let isDataInCache = await client.exists(CACHE_NAMES.FUND_DETAILS.NAME);
    if (isDataInCache == 1) {
      console.log(`Cache Hit for ${CACHE_NAMES.FUND_DETAILS.NAME}`);
      let cacheData = await client.get(CACHE_NAMES.FUND_DETAILS.NAME);
      return res.json(JSON.parse(cacheData));
    }

    let fundDetails = await callApiToGetFundAndMargin();
    if (!fundDetails)
      throw { code: "502", msg: "Unable to fetch fund details." };

    let responseObj = {
      status: "Success",
      statusCode: HttpCode.SUCCESS,
      data: fundDetails.equity,
    };

    await client.setex(CACHE_NAMES.FUND_DETAILS.NAME, CACHE_NAMES.FUND_DETAILS.TTL, JSON.stringify(responseObj), ()=>console.log("Fund Details set in Cache"));

    res.json(responseObj);
  } catch (err) {
    console.log(err);
    return res.json({
      status: "Error",
      statusCode: err.code ?? "500",
      data: err.msg ?? "Internal Server Error",
    });
  }
}
