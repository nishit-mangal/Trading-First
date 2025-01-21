import { PrismaClient } from "@prisma/client";
import { callApiToGenerateAccessToken } from "./apiContainer.js";

const prisma = new PrismaClient();

export async function generateAccessTokenHandler(code, apiSecret, apiKey) {
  const accessToken = await callApiToGenerateAccessToken(code, apiSecret, apiKey);
  if (!accessToken) return null;
  console.log("\nNew Access Token: \n", accessToken);
  return accessToken;
}

export async function createGoogleUser(email, name, picture){
  let newUser = await prisma.users.create({
      data: {
          username: name,
          email,
          is_verified: true,
          picture
      },
  });
  return newUser;
}

export async function verifyExistingUserAndUpdatePicture(userId, picture) {
  await prisma.users.update({
    where:{
      id:userId
    },
    data:{
      is_verified:true,
      picture
    }
  })
}