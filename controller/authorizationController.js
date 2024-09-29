import {} from "dotenv/config";
import { generateAccessTokenHandler } from "../handler/authorizationHandler.js";
import { HttpCode } from "../Constants/constants.js";

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
