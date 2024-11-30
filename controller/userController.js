import axios from "axios";
import { accessToken } from "../Constants/authorizationConst.js";
import { callApiToGetFundAndMargin } from "../handler/apiContainer.js";
import { client } from "../Clients/clients.js";
import { CACHE_NAMES, HTTP_MESSAGE, HttpCode } from "../Constants/constants.js";
import { checkIfUserExistWithEmail, createUserInDB, findValidOTPsAndCheckIfValid, markUserAccountVerified, saveOTPinDB, sendEmailVerifiationCode } from "../handler/userHandler.js";

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
    let accessToken = req.headers['upstox-access-token'];
    let isDataInCache = await client.exists(CACHE_NAMES.FUND_DETAILS.NAME);
    if (isDataInCache == 1) {
      console.log(`Cache Hit for ${CACHE_NAMES.FUND_DETAILS.NAME}`);
      let cacheData = await client.get(CACHE_NAMES.FUND_DETAILS.NAME);
      return res.json(JSON.parse(cacheData));
    }

    let fundDetails = await callApiToGetFundAndMargin(accessToken);
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
/**
 * 
 * @param {username, password, email, phoneNumber} req 
 * @param {*} res 
 */
export async function createUser(req, res){
  try{
    let reqObj = req.body;
    if(!reqObj || !reqObj.username || !reqObj.email || !reqObj.password){
      console.log("Invalid input in fn:createUser");
      throw { code: HttpCode.BAD_REQUEST, msg: "Missing Data" };
    }
    let user = await createUserInDB(reqObj);
    if(!user)
      throw { code: HttpCode.INTERNAL_SERVER_ERROR, msg:"Failure in creating user"};
    console.log("\nSuccessfully Created user.", user);

    let otpResponse = await sendEmailVerifiationCode(user.data.email);
    if(!otpResponse)
      throw { code: HttpCode.INTERNAL_SERVER_ERROR, msg:"Failure in OTP mail"}

    await saveOTPinDB(otpResponse, user.data.id);
    
    let responseObj = {
      status: user.status,
      statusCode: user.statusCode,
      data: user.data,
    };

    res.json(responseObj);
  }catch(err){
    console.log(err.msg ?? err);
    return res.json({
      status: "Error",
      statusCode: err.code ?? HttpCode.INTERNAL_SERVER_ERROR,
      data: err.msg ?? "Internal Server Error",
    });
  }
}

/**
 * 
 * @param {email:string, otp:number} req 
 * @param {*} res 
 */
export async function verifyEmail(req, res){
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try{
    let reqObj = req.body;
    if(!reqObj || !reqObj.email || !reqObj.otp){
      console.log("Invalid input in fn:verifyEmail");
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data";
    }

    let user = await checkIfUserExistWithEmail(reqObj.email);
    if(!user){
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist with given email";
      throw "User doesn't exist with email: " + reqObj.email;
    }
  
    reqObj.otp = Number(reqObj.otp);
    let validOTP = await findValidOTPsAndCheckIfValid(user.id, reqObj.otp);
    if(validOTP.status==="Err"){
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = validOTP.msg;
      throw "Failure validating OTP.";
    }

    await markUserAccountVerified(user.id);
    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Successfully verified email";
    res.json(response);
  }catch(err){
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    res.json(response);
  }
}

export async function resendOTP(req, res){
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try{
    let reqObj = req.body;
    if(!reqObj || !reqObj.email){
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data in fn::resendOTP";
    }

    let user = await checkIfUserExistWithEmail(reqObj.email);
    if(!user){
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist with given email";
      throw "User doesn't exist with email: " + reqObj.email;
    }else if(user?.is_verified){
      response.responseCode = HttpCode.CONFLICT;
      response.responseMessage = "User is already verified";
      throw "Error in fn:: resendOTP. Can not send OTP to already verified user.";
    }

    let otpResponse = await sendEmailVerifiationCode(user.email);
    if(!otpResponse){
      response.responseCode = HttpCode.INTERNAL_SERVER_ERROR;
      response.responseMessage = "Failed to send OTP. Try Later.";
      throw "Error in fn:: resendOTP. Failed sending OTP";
    }

    await saveOTPinDB(otpResponse, user.id);
    
    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "OTP sent.";
    res.json(response);
  }catch(err){
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    res.json(response);
  }
}