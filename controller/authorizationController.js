import jwt from "jsonwebtoken";
import {} from "dotenv/config";
import { createGoogleUser, generateAccessTokenHandler, verifyExistingUserAndUpdatePicture } from "../handler/authorizationHandler.js";
import { HTTP_MESSAGE, HttpCode } from "../Constants/constants.js";
import { checkIfUserExistWithEmail, getUserById } from "../handler/userHandler.js";
import { googleApiClient } from "../Clients/googleAPI.js";
import { callApiToGetGoogleProfile } from "../handler/apiContainer.js";

export async function generateAccessToken(req, res) {
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try {
    if(!req.query.code || !req.query.userId){
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw 'Code or userId not received.'
    }
    
    let user = await getUserById(req.query.userId);
    if (!user) {
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = "User doesn't exist.";
      throw "User does not exist.";
    }
    
    let newAccessCode = await generateAccessTokenHandler(req.query.code, user.user_api_secret, user.user_api_key);
    if(!newAccessCode)
      throw 'Code Not Generated'

    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Successfully generated code.";
    response.data = newAccessCode;
    return res.json(response);
  } catch (err) {
    console.log(err.msg ?? err);
    res.json(response);
  }
}

export async function verifyToken(req, res){
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  try{
    let reqObj = req.body;
    if(!reqObj || !reqObj.token){
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw "Missing Data in fn::verifyToken";
    }
    let jwtObject = jwt.verify(reqObj.token, process.env.JWT_TOKEN);
    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Token verified";
    response.data = jwtObject; 
       
    res.json(response);
  }catch(err){
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    res.json(response);
  }
}

export async function googleCodeAuth(req, resp){
  let response = {
    responseCode: HttpCode.INTERNAL_SERVER_ERROR,
    responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
  };
  
  try{
    if(!req.query.code){
      response.responseCode = HttpCode.BAD_REQUEST;
      response.responseMessage = HTTP_MESSAGE.INVALID_INPUT;
      throw 'Code not received.'
    }
    console.log("code: ", req.query.code);
    const googleUserResponse = await googleApiClient.getToken(req.query.code);
    googleApiClient.setCredentials(googleUserResponse.tokens);
    
    let userDetails = await callApiToGetGoogleProfile(googleUserResponse.tokens.access_token);
    console.log("userDetails: ", userDetails.data);
    
    let {email, name, picture} = userDetails.data;
    if(!email){
      response.responseCode = HttpCode.INTERNAL_SERVER_ERROR;
      response.responseMessage = "Google Authentication failed.";
      throw "Did not receive Email from google";    
    }

    let user = await checkIfUserExistWithEmail(email);
    console.log("iuser:", user);
    if(!user){
      user = await createGoogleUser(email, name, picture);
    }else{
      await verifyExistingUserAndUpdatePicture(user.id, picture);
    }

    let loginToken = jwt.sign(
      {
        userId: Number(user.id.toString()),
        userEmail: user.email,
        hasPin: user.pin ? true : false,
        isVerified: true
      },
      process.env.JWT_TOKEN
    )
    
    response.data = {
      userId: user.id.toString(),
      userPin: !!user.pin,
      userVerified: user.is_verified,
      userEmail: user.email,
      accessToken: loginToken
    }

    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Successfully verified user.";
    return resp.json(response);
  }catch(err){
    console.log(err.msg ?? err);
    resp.json(response);
  }
}