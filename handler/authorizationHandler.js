import { PrismaClient } from "@prisma/client";
import { callApiToGenerateAccessToken, callApiToGetHoldings } from "./apiContainer.js";

const prisma = new PrismaClient();

export async function generateAccessTokenHandler(code, apiSecret, apiKey) {
  const accessToken = await callApiToGenerateAccessToken(code, apiSecret, apiKey);
  if (!accessToken) return null;
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
      id:Number(userId)
    },
    data:{
      is_verified:true,
      picture: picture
    }
  })
}

export async function getUpstoxUserUsingUserId(userId){
  const existingUser = await prisma.upstox_users.findFirst({
    where:{
      user_id:Number(userId)
    }
  })

  if(!existingUser)
    return false;
  return existingUser;
}

export async function putUpstoxUserDetails(upstoxProfile, userId){
  let upstoxUser = await prisma.upstox_users.create({
    data:{
      upstox_id: upstoxProfile.user_id,
      email: upstoxProfile.email,
      user_name: upstoxProfile.user_name,
      is_active: upstoxProfile.is_active,
      user_id: userId
    }
  });
    
  return upstoxUser ? upstoxUser : null;
}

export function filterHoldings(holdings, userId){
  let ans = [];
  for(let i=0; i<holdings.length; i++){
    const holding = holdings[i];

    let tempObj = {
      user_id: userId,
      company_name: holding.company_name,
      quantity: holding.quantity + holding.t1_quantity,
      pnl: holding.pnl,
      trading_symbol: holding.trading_symbol,
      last_price: holding.last_price,
      instrument_token: holding.instrument_token,
      average_price: holding.average_price
    }
    ans.push(tempObj);
  }
  return ans;
}

export async function updateUserHoldings(holdings, userId){
  await prisma.holdings.deleteMany({
    where:{
      user_id:userId
    }
  })

  await prisma.holdings.createMany({
    data:holdings
  })
}

export async function fetchAndUpdateUserHoldings(accessCode, userId){
  /**
   * Contains array of object having:
   * isin:string, company_name:string, quantity:number,
   * trading_symbol: string, last_price: number, pnl: number,
   * instrument_token:string, average_price: number, t1_quantity: number
   */
  let holdings = await callApiToGetHoldings(`Bearer ${accessCode}`);
  let filteredHolding = filterHoldings(holdings, userId);
  await updateUserHoldings(filteredHolding, userId);
}