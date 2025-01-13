import { callApiToGenerateAccessToken } from "./apiContainer.js";

export async function generateAccessTokenHandler(code, apiSecret, apiKey) {
  const accessToken = await callApiToGenerateAccessToken(code, apiSecret, apiKey);
  if (!accessToken) return null;
  console.log("\nNew Access Token: \n", accessToken);
  return accessToken;
}
