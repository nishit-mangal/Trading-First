import jwt from "jsonwebtoken";
import {} from "dotenv/config";
import { generateAccessTokenHandler } from "../handler/authorizationHandler.js";
import { HTTP_MESSAGE, HttpCode } from "../Constants/constants.js";

export async function generateAccessToken(req, res) {
  try {
    if(!req.query.code)
      throw 'Code Not Received'

    let newAccessCode = await generateAccessTokenHandler(req.query.code);
    if(!newAccessCode)
      throw 'Code Not Generated'

    return res.json({
      status: "Success",
      statusCode: HttpCode.SUCCESS,
      data: newAccessCode,
    });
  } catch (err) {
    console.log(err.msg ?? err);
    return res.json({
      status: "Error",
      statusCode: err.code ?? HttpCode.INTERNAL_SERVER_ERROR,
      data: err.msg ?? "Internal Server Error",
    });
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
    console.log(jwtObject);
    response.responseCode = HttpCode.SUCCESS;
    response.responseMessage = "Token verified";
    response.data = jwtObject; 
       
    res.json(response);
  }catch(err){
    console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
    res.json(response);
  }
}