import axios from "axios";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { } from "dotenv/config";
import { accessToken } from "../Constants/authorizationConst.js";
import { callApiToGetFundAndMargin } from "../handler/apiContainer.js";
import { client } from "../Clients/clients.js";
import { CACHE_NAMES, HTTP_MESSAGE, HttpCode } from "../Constants/constants.js";
import { checkIfUserExistWithEmail, createUserInDB, findValidOTPsAndCheckIfValid, getUserWithEmailAndPin, markUserAccountVerified, prepareResetLink, saveOTPinDB, sendEmailVerifiationCode, setPinForUserId, updatePasswordWithEmail } from "../handler/userHandler.js";

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

    await client.setex(CACHE_NAMES.FUND_DETAILS.NAME, CACHE_NAMES.FUND_DETAILS.TTL, JSON.stringify(responseObj), () => console.log("Fund Details set in Cache"));

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
export async function createUser(req, res) {
  try {
    let reqObj = req.body;
    if (!reqObj || !reqObj.username || !reqObj.email || !reqObj.password) {
      console.log("Invalid input in fn:createUser");
      throw { code: HttpCode.BAD_REQUEST, msg: "Missing Data" };
    }
    let existingUserResp = await checkIfUserExistWithEmail(reqObj.email);
    if (existingUserResp)
      throw { code: HttpCode.CONFLICT, msg: "User already exists with the entered email." };

    let user = await createUserInDB(reqObj);
    if (!user)
      throw { code: HttpCode.INTERNAL_SERVER_ERROR, msg: "Failure in creating user" };

    let otpResponse = sendEmailVerifiationCode(user.data.email);

    await saveOTPinDB(otpResponse, user.data.id);

    let responseObj = {
      status: user.status,
      statusCode: user.statusCode,
      data: user.data,
    };

    res.json(responseObj);
  } catch (err) {
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
export async function verifyEmail(req, res) {
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try {
    let reqObj = req.body;
    if (!reqObj || !reqObj.email || !reqObj.otp) {
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data";
    }

    let user = await checkIfUserExistWithEmail(reqObj.email);
    if (!user) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist with given email";
      throw "User doesn't exist with email: " + reqObj.email;
    } else if (user?.is_verified) {
      response.responseCode = HttpCode.CONFLICT;
      response.responseMessage = "User is already verified";
      throw "Error in fn:: verifyEmail. Can not verify already verified user.";
    }

    reqObj.otp = Number(reqObj.otp);
    let validOTP = await findValidOTPsAndCheckIfValid(user.id, reqObj.otp);
    if (validOTP.status === "Err") {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = validOTP.msg;
      throw "Failure validating OTP.";
    }

    await markUserAccountVerified(user.id);
    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Successfully verified email";
    res.json(response);
  } catch (err) {
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    res.json(response);
  }
}

export async function resendOTP(req, res) {
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try {
    let reqObj = req.body;
    if (!reqObj || !reqObj.email) {
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data in fn::resendOTP";
    }

    let user = await checkIfUserExistWithEmail(reqObj.email);
    if (!user) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist with given email";
      throw "User doesn't exist with email: " + reqObj.email;
    } else if (user?.is_verified) {
      response.responseCode = HttpCode.CONFLICT;
      response.responseMessage = "User is already verified";
      throw "Error in fn:: resendOTP. Can not send OTP to already verified user.";
    }

    let otpResponse = sendEmailVerifiationCode(user.email);

    await saveOTPinDB(otpResponse, user.id);

    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "OTP sent.";
    res.json(response);
  } catch (err) {
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    res.json(response);
  }
}

export async function loginUser(req, resp) {
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try {
    let reqObj = req.body;
    if (!reqObj || !reqObj.email || !reqObj.password) {
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data in fn::loginUser";
    }

    let user = await checkIfUserExistWithEmail(reqObj.email);
    if (!user) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist with given email";
      throw "User doesn't exist with email: " + reqObj.email;
    }

    const passwordMatch = await bcrypt.compare(reqObj.password, user.password);
    if (!passwordMatch) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "Invalid Password.";
      throw "Invalid Password";
    }
    let accessToken = jwt.sign(
      {
        userId: Number(user.id.toString()),
        userEmail: user.email,
        hasPin: user.pin ? true : false,
        isVerified: user.is_verified
      },
      process.env.JWT_TOKEN
    )

    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Successfully Logged In";
    response.data = {
      userId: user.id.toString(),
      userPin: user.pin,
      userVerified: user.is_verified,
      userEmail: user.email,
      accessToken
    }

    resp.json(response);
  } catch (err) {
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    resp.json(response);
  }
}

export async function setPin(req, resp) {
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try {
    let reqObj = req.body;
    if (!reqObj || !reqObj.email || !reqObj.password || !reqObj.pin || reqObj.pin.length !== 4) {
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data in fn::setPin";
    }

    let user = await checkIfUserExistWithEmail(reqObj.email);
    if (!user) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist with given email";
      throw "User doesn't exist with email: " + reqObj.email;
    }

    const passwordMatch = await bcrypt.compare(reqObj.password, user.password);
    if (!passwordMatch) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "Invalid Password.";
      throw "Invalid Password";
    }

    let pinRes = await setPinForUserId(user.id, reqObj.pin);
    if (!pinRes) {
      response.responseCode = HttpCode.NO_CONTENT;
      response.responseMessage = HTTP_MESSAGE.NO_CONTENT;
      throw "Error in fn::setPin No Data";
    }

    let loginToken = jwt.sign(
      {
        userId: Number(user.id.toString()),
        userEmail: user.email,
        hasPin: pinRes.pin ? true : false
      },
      process.env.JWT_TOKEN
    )
    let sessionToken = jwt.sign(
      {
        userId: Number(user.id.toString()),
        userEmail: user.email
      },
      process.env.JWT_TOKEN
    )
    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Pin set Successfully";
    response.data = {
      userId: (pinRes.id).toString(),
      userEmail: pinRes.email,
      userPin: pinRes.pin,
      loginToken
    }
    resp.cookie("session-token", sessionToken, { maxAge: 1 * 60 * 60 * 1000 });
    resp.json(response);
  } catch (err) {
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    resp.json(response);
  }
}

export async function verifyPin(req, resp) {
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try {
    let reqObj = req.body;
    if (!reqObj || !reqObj.email || !reqObj.pin || reqObj.pin.length !== 4) {
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data in fn::verifyPin";
    }

    let userResponse = await getUserWithEmailAndPin(reqObj.email, reqObj.pin);
    if (!userResponse) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "Invalid Pin.";
      throw "Invalid Pin";
    }

    let accessToken = jwt.sign(
      {
        userId: Number(userResponse.id.toString()),
        userEmail: userResponse.email
      },
      process.env.JWT_TOKEN
    )

    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Pin verified successfully";
    resp.cookie("session-token", accessToken, { maxAge: 1 * 60 * 60 * 1000 });
    resp.json(response);
  } catch (err) {
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    resp.json(response);
  }
}

export async function forgotPassword(req, resp) {
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try {
    let reqObj = req.body;
    if (!reqObj || !reqObj.email) {
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data in fn::forgotPassword";
    }

    let user = await checkIfUserExistWithEmail(reqObj.email);
    if (!user) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist with given email.";
      throw "User doesn't exist with email: " + reqObj.email;
    }

    let resetLink = prepareResetLink(user.email);
    console.log(resetLink);
    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Reset Link sent to respective email.";
    resp.json(response);
  } catch (err) {
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    resp.json(response);
  }
}

export async function resetPassword(req, resp) {
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try {
    let reqObj = req.body;
    console.log("reqObj", reqObj);
    if (!reqObj || !reqObj.email || !reqObj.currPassword || !reqObj.newPassword || !reqObj.confirmNewPassword || reqObj.newPassword !==reqObj.confirmNewPassword) {
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data in fn::resetPassword";
    }

    let user = await checkIfUserExistWithEmail(reqObj.email);
    if (!user) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist with given email";
      throw "User doesn't exist with email: " + reqObj.email;
    }

    const passwordMatch = await bcrypt.compare(reqObj.currPassword, user.password);
    if (!passwordMatch) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "Invalid current password.";
      throw "Invalid Password";
    }
    const hashedPassword = await bcrypt.hash(reqObj.newPassword, 10);
    let updateResp = await updatePasswordWithEmail(reqObj.email, hashedPassword);
    if(!updateResp)
      throw "Password update failed";
    
    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Password updated successfully.";
    resp.json(response);
  } catch (err) {
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    resp.json(response);
  }
}