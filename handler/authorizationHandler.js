import { HttpCode } from "../Constants/constants.js";
import { callApiToGenerateAccessToken } from "./apiContainer.js";

export async function generateAccessTokenHandler() {
  const accessToken = await callApiToGenerateAccessToken();
  if (!accessToken) throw { code: HttpCode.BAD_GATEWAY, msg: "Access Token Not generated" };
  console.log("\nNew Access Token: \n", accessToken);
  return true;
}
