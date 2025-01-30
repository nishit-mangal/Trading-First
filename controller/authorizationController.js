import jwt from "jsonwebtoken";
import {} from "dotenv/config";
import { createGoogleUser, fetchAndUpdateUserHoldings, generateAccessTokenHandler, getUpstoxUserUsingUserId, putUpstoxUserDetails, verifyExistingUserAndUpdatePicture } from "../handler/authorizationHandler.js";
import { HTTP_MESSAGE, HttpCode } from "../Constants/constants.js";
import { checkIfUserExistWithEmail, getUserById } from "../handler/userHandler.js";
import { googleApiClient } from "../Clients/googleAPI.js";
import { callApiToGetGoogleProfile, callApiToGetUserProfile } from "../handler/apiContainer.js";

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
    console.log("user: ", user);
    let newAccessCode = await generateAccessTokenHandler(req.query.code, user.user_api_secret, user.user_api_key);
    if(!newAccessCode)
      throw 'Code Not Generated'
    console.log("newAccessCode: ", newAccessCode);
    
    //get relevant upstox user
    let existingUpstoxUserProfile = await getUpstoxUserUsingUserId(user.id);
    console.log("existingUpstoxUserProfile: ", existingUpstoxUserProfile);
    
    /**
     * Contains:
     * email:string, exchanges:string[], products:string[],
     * broker:string, user_id:string, user_name:string, is_active:boolean
     */
    let upstoxProfile = await callApiToGetUserProfile(newAccessCode);
    if(!upstoxProfile){
      response.responseCode = HttpCode.INTERNAL_SERVER_ERROR;
      response.responseMessage = "Failed fetching upstox user details. Try generating the token again.";
      throw "Failed fetching upstox user details.";
    }
    console.log("upstoxProfile: ", upstoxProfile);
    
    if(!existingUpstoxUserProfile){
      //save user profile
      putUpstoxUserDetails(upstoxProfile, user.id);
      
      response.responseCode = HttpCode.SUCCESS;
      response.responseMessage = "Successfully generated code.";
      response.data = newAccessCode;    
      return res.json(response);
    }
    
    if(upstoxProfile.email !== existingUpstoxUserProfile.email){
      response.responseCode = HttpCode.UNAUTHORIZED;
      response.responseMessage = `Looks like you have enetered the api details for a different user. Put API details for ${existingUpstoxUserProfile.email}`;
      throw "Different user detected.";
    }

    fetchAndUpdateUserHoldings(newAccessCode, user.id);
    
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
    const googleUserResponse = await googleApiClient.getToken(req.query.code);
    googleApiClient.setCredentials(googleUserResponse.tokens);
    
    let userDetails = await callApiToGetGoogleProfile(googleUserResponse.tokens.access_token);
    
    let {email, name, picture} = userDetails.data;
    if(!email){
      response.responseCode = HttpCode.INTERNAL_SERVER_ERROR;
      response.responseMessage = "Google Authentication failed.";
      throw "Did not receive Email from google";    
    }

    let user = await checkIfUserExistWithEmail(email);
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