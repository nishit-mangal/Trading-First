import axios from "axios";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { } from "dotenv/config";
import { accessToken } from "../Constants/authorizationConst.js";
import { callApiToGetFundAndMargin } from "../handler/apiContainer.js";
import { client } from "../Clients/clients.js";
import { CACHE_NAMES, HTTP_MESSAGE, HttpCode, OTP_TYPES } from "../Constants/constants.js";
import { checkIfUserExistWithEmail, createUserInDB, findValidOTPsAndCheckIfValid, getUserById, getUserWithEmailAndPin, markUserAccountVerified, saveOTPinDB, sendEmailVerifiationCode, setAPISecret, setPinProcess, updatePasswordWithEmail } from "../handler/userHandler.js";
import { triggerMail } from "../Utility/emailSender.js";
import { resetLink } from "../views/emailHTMLs.js";
import { checkIfUuid } from "../Constants/regex.js";

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

    let otpResponse = sendEmailVerifiationCode(user.data.email, OTP_TYPES.EMAIL_VERIFICATION.NAME);

    await saveOTPinDB(otpResponse, user.data.id, OTP_TYPES.EMAIL_VERIFICATION.NAME);

    let responseObj = {
      status: user.status,
      statusCode: user.statusCode
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
    reqObj.otp = Number(reqObj.otp);

    let user = await checkIfUserExistWithEmail(reqObj.email);
    if (!user) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist with given email";
      throw "User doesn't exist with email: " + reqObj.email;
    }

    if(reqObj.pin && reqObj.pin.length===4){
      let setPinResp = await setPinProcess(user, reqObj.otp, reqObj.pin);
      res.json(setPinResp);
      return;
    }

    if (user?.is_verified) {
      response.responseCode = HttpCode.CONFLICT;
      response.responseMessage = "User is already verified";
      throw "Error in fn:: verifyEmail. Can not verify already verified user.";
    }

    let validOTP = await findValidOTPsAndCheckIfValid(user.id, reqObj.otp);
    if (validOTP.status === "Err") {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = validOTP.msg;
      throw "Failure validating OTP.";
    }

    await markUserAccountVerified(user.id);

    let loginToken = jwt.sign(
      {
        userId: Number(user.id.toString()),
        userEmail: user.email,
        hasPin: user.pin ? true : false,
        isVerified: true
      },
      process.env.JWT_TOKEN
    )
    
    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Successfully verified email";
    response.data = {
      loginToken 
    }
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
    } 

    if(reqObj.type && reqObj.type === OTP_TYPES.SET_PIN.NAME){
      let otpResponse = sendEmailVerifiationCode(user.email, OTP_TYPES.SET_PIN.NAME);
      await saveOTPinDB(otpResponse, user.id, OTP_TYPES.SET_PIN.NAME);
      
      response.responseCode = HttpCode.SUCCESS;
      response.responseMessage = "OTP sent successfully";      
      res.json(response);
      return;
    }

    if (user?.is_verified) {
      response.responseCode = HttpCode.CONFLICT;
      response.responseMessage = "User is already verified";
      throw "Error in fn:: resendOTP. Can not send OTP to already verified user.";
    }

    let otpResponse = sendEmailVerifiationCode(user.email, OTP_TYPES.EMAIL_VERIFICATION.NAME);

    await saveOTPinDB(otpResponse, user.id, OTP_TYPES.EMAIL_VERIFICATION.NAME);

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
    if (!reqObj || !reqObj.email || !reqObj.pin || reqObj.pin.length !== 4) {
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
    
    let otpResponse = sendEmailVerifiationCode(user.email, OTP_TYPES.SET_PIN.NAME);
    await saveOTPinDB(otpResponse, user.id, OTP_TYPES.SET_PIN.NAME);

    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "OTP sent successfully";
    
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
    response.data = {
      pinToken: accessToken
    }
    
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

    let resetPasswordToken = jwt.sign(
      {
        userId: Number(user.id.toString()),
        email: user.email
      },
      process.env.JWT_TOKEN + user.password,
      {
        expiresIn:"10m"
      }
    )

    let link = `http://localhost:5173/forgotPassword/${user.id}/${resetPasswordToken}`;
    console.log("Reset Link: ", link);
    
    triggerMail(user.email, "Password Reset Link", resetLink(link));

    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Reset link sent to respective email.";
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
    if (!reqObj || !reqObj.email || !reqObj.currPassword || !reqObj.newPassword || !reqObj.confirmNewPassword || reqObj.newPassword !== reqObj.confirmNewPassword) {
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
    if (!updateResp)
      throw "Password update failed";

    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Password updated successfully.";
    resp.json(response);
  } catch (err) {
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    resp.json(response);
  }
}

export async function resetForgotPassword(req, resp) {
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try {
    let reqObj = req.body;
    if (!reqObj || !reqObj.userId || !reqObj.token || !reqObj.newPassword || !reqObj.confirmNewPassword || reqObj.newPassword !== reqObj.confirmNewPassword) {
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data in fn::resetForgotPassword";
    }

    let user = await getUserById(reqObj.userId);
    if (!user) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist.";
      throw "Invalid link to reset password. Try generating link again.";
    }

    jwt.verify( reqObj.token, process.env.JWT_TOKEN + user.password);
    
    const hashedPassword = await bcrypt.hash(reqObj.newPassword, 10);
    let updateResp = await updatePasswordWithEmail(user.email, hashedPassword);
    if (!updateResp)
      throw "Password update failed";

    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Password set successfully.";
    resp.json(response);
  } catch (err) {
    if(err instanceof jwt.TokenExpiredError)
      response.responseMessage = "Link expired. Try generating new.";
    else if (err instanceof jwt.JsonWebTokenError)
      response.responseMessage = "Invalid Reset Link";
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    resp.json(response);
  }
}

export async function getUserDetails(req, resp){
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try {
    let userId = parseInt(req.params.userId);
    if (!userId) {
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data in fn::getUserDetails";
    }

    let user = await getUserById(userId);
    if (!user) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist.";
      throw "User does not exist.";
    }
    
    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Password set successfully.";
    response.data = {
      name: user.username,
      isVerified: user.is_verified,
      secretsExists: !!(user.user_api_key && user.user_api_secret),
      apiKey: user.user_api_key,
      imgUrl: user.picture
    }

    resp.json(response);
  } catch (err) {
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    resp.json(response);
  }
}

export async function setAPIData(req, resp) {
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try {
    let reqObj = req.body;
    
    if (!reqObj || !reqObj.userId || !reqObj.apiSecret || !reqObj.apiKey) {
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data in fn::setAPIData";
    }
    
    if(!checkIfUuid(reqObj.apiKey)){
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = "Api key must be UUID.";
      throw "Invalid api key type. It must be UUID.";
    }

    let user = await getUserById(reqObj.userId);
    if (!user) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist.";
      throw "User does not exist.";
    }

    //update API secret
    await setAPISecret(reqObj.userId, reqObj.apiSecret, reqObj.apiKey);

    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "API secrets set successfully.";
    
    resp.json(response);
  } catch (err) {
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    resp.json(response);
  }
}