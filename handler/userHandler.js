import bcrypt from "bcrypt"
import { PrismaClient } from "@prisma/client"
import { HttpCode } from "../Constants/constants.js";
import { triggerMail } from "../Utility/emailSender.js";
import { generateRandomNumber } from "../Utility/utilityFunctions.js";
import { encrypt } from "../Utility/encryptionDecryption.js";

const prisma = new PrismaClient();
/**
 * 
 * @param {username:string, email:string, password:hashedstring} reqObj 
 */
export async function createUserInDB(reqObj){
    const hashedPassword = await bcrypt.hash(reqObj.password, 10);
    let newUser = await prisma.users.create({
        data: {
            username: reqObj.username,
            email: reqObj.email,
            password: hashedPassword,
            phone_number: reqObj.phoneNumber
        },
    });

    // Convert BigInt fields to strings
    const {password, ...userResponse} = {
        ...newUser,
        id: newUser.id.toString(),
    };
    return {
        statusCode: HttpCode.SUCCESS,
        status: "New User Created Successfully",
        data: userResponse,
    };
}

export async function checkIfUserExistWithEmail(email){
    const existingUser = await prisma.users.findFirst({
        where:{
            email:email
        }
    })
    if(!existingUser)
        return false;
    return existingUser;
}

export async function findValidOTPsAndCheckIfValid(userId, otp){
    let validOTP = await prisma.otp.findFirst({
        where:{
            user_id:userId
        }
    })
    if(!validOTP)
        return {status:"Err", msg:"No valid OTP found."};

    if(validOTP.otp!==otp)
        return {status:"Err", msg:"Invalid OTP"};

    if(validOTP.expired_at<=Date.now())
        return {status:"Err", msg:"OTP has expired."};
    
    return {status:"Success", msg:"Valid OTP"};
}

export async function markUserAccountVerified(userId){
    await prisma.users.update({
        where:{
            id:userId
        },
        data:{
            is_verified:true
        }
    })

    await prisma.otp.deleteMany({
        where:{
            user_id:userId
        }
    })
}

export function sendEmailVerifiationCode(email){
    if(!email){
        console.log("Invalid Input. \nEmail not recieved in fn:sendEmailVerifiationCode");
        return null;
    }
    let otp = generateRandomNumber();
    triggerMail(
        email, 
        "Verification Email",
        `<h1>Please confirm your OTP</h1>
        <p>Here is your OTP code: ${otp}</p>`
    )
    return otp;
}

export async function saveOTPinDB(otp, userId){
    try{
        if(!otp || !userId)
            throw "No OTP received. Not saving to DB";
        
        await prisma.otp.deleteMany({
            where:{
                user_id:userId
            }
        })

        let oneHourLater = new Date();
        oneHourLater.setHours(oneHourLater.getHours() + 1);

        await prisma.otp.create({
            data:{
                otp:otp,
                user_id:userId,
                expired_at:oneHourLater
            }
        })        
    }catch(err){
        console.log(err);        
    }
}

export async function setPinForUserId(userId, pin){
    try{
        let response = await prisma.users.update({
            where:{
                id:Number(userId)
            },
            data:{
                pin
            }
        })
        return response;
    }catch(err){
        console.log(err);
        return false;
    }
}

export async function getUserWithEmailAndPin(userEmail, pin){
    try{
        let response = await prisma.users.findUnique({
            where:{
                email:userEmail,
                pin:pin
            }
        })
        return response;
    }catch(err){
        console.log(err);
        return false;
    }
}

export async function updatePasswordWithEmail(userEmail, password){
    try{
        await prisma.users.update({
            where:{
                email:userEmail
            },
            data:{
                password:password
            }
        })
        return true;
    }catch(err){
        console.log("Password update failed in fn::updatePasswordWithEmail\n", err);
        return false;
    }
}

export async function prepareResetLink(email){
    let encryptedEmail = encrypt(email);
    return `http://localhost:5173/forgotPassword/?key=${encryptedEmail}`;
}

export async function getUserById(userId){
    const existingUser = await prisma.users.findFirst({
        where:{
            id:userId
        }
    })
    if(!existingUser)
        return false;
    return existingUser;
}

export async function setAPISecret(userId, apiSecret, apiKey){
    await prisma.users.update({
        where:{
            id: userId
        },
        data:{
            user_api_secret:apiSecret,
            user_api_key: apiKey
        }
    })
}