import { accessToken, code } from "../Constants/authorizationConst.js";
import {} from "dotenv/config";
import { generateAccessTokenHandler } from "../handler/authorizationHandler.js";
import { HttpCode } from "../Constants/constants.js";
// TODO: write a code to save access token. Write it in a manner that the value is set on server start (if available)
// function setAccessToken(token){
//     accessToken = token
// }
// function getAccessToken(){
//     return accessToken
// }
export async function generateAccessToken(req, res) {
  try {
    let response = await generateAccessTokenHandler();
    return res.json({
      status: "Success",
      statusCode: HttpCode.SUCCESS,
      data: "AccessToken Successfully updated",
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
