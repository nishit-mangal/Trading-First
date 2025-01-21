import jwt from "jsonwebtoken";
import {} from "dotenv/config";
import { generateAccessTokenHandler } from "../handler/authorizationHandler.js";
import { HTTP_MESSAGE, HttpCode } from "../Constants/constants.js";
import { getUserById } from "../handler/userHandler.js";

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
    console.log(user);

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