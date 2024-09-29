import { HttpCode } from "../Constants/constants.js";
import { callApiToGenerateAccessToken } from "./apiContainer.js";

export async function generateAccessTokenHandler(code) {
  const accessToken = await callApiToGenerateAccessToken(code);
  if (!accessToken) return null;
  console.log("\nNew Access Token: \n", accessToken);
  return accessToken;
}
