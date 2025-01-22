import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import { } from "dotenv/config";
import { PrismaClient } from "@prisma/client"
import { HTTP_MESSAGE, HttpCode, OTP_TYPES } from "../Constants/constants.js";
import { triggerMail } from "../Utility/emailSender.js";
import { generateRandomNumber } from "../Utility/utilityFunctions.js";
import { encrypt } from "../Utility/encryptionDecryption.js";
import { emailVerificationOTP, setPinOTP } from "../views/emailHTMLs.js";

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

export async function findValidOTPsAndCheckIfValid(userId, otp, type){
    let validOTP = await prisma.otp.findFirst({
        where:{
            user_id:userId,
            ...(type && { otp_type: type })
        }
    });

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

export function sendEmailVerifiationCode(email, type){
    if(!email){
        console.log("Invalid Input. \nEmail not recieved in fn:sendEmailVerifiationCode");
        return null;
    }
    
    let body, subject, otp = generateRandomNumber();
    if(type === OTP_TYPES.EMAIL_VERIFICATION.NAME){
        body = emailVerificationOTP(otp);
        subject = OTP_TYPES.EMAIL_VERIFICATION.SUBJECT;
    }
    else if(type === OTP_TYPES.SET_PIN.NAME){
        body = setPinOTP(otp);
        subject = OTP_TYPES.SET_PIN.SUBJECT;
    }

    triggerMail(email, subject, body);
    return otp;
}

export async function saveOTPinDB(otp, userId, type){
    try{
        if(!otp || !userId || !type)
            throw "No OTP received. Not saving to DB";
        
        await prisma.otp.deleteMany({
            where:{
                user_id:userId,
                otp_type: type
            }
        })

        let oneHourLater = new Date();
        oneHourLater.setHours(oneHourLater.getHours() + 1);

        await prisma.otp.create({
            data:{
                otp:otp,
                user_id:userId,
                expired_at:oneHourLater,
                otp_type: type
            }
        })        
    }catch(err){
        console.log(err);        
    }
}

export async function setPinForUserId(userId, pin, type){
    try{
        let response = await prisma.users.update({
            where:{
                id:Number(userId)
            },
            data:{
                pin
            }
        })
        await prisma.otp.deleteMany({
            where:{
                user_id:userId,
                otp_type: type
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

export async function setPinProcess(user, otp, pin){
    let response = {
        responseCode: HttpCode.INTERNAL_SERVER_ERROR,
        responseMessage: HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
    };
    try{
        let validOTP = await findValidOTPsAndCheckIfValid(user.id, otp, OTP_TYPES.SET_PIN.NAME);
        if (validOTP.status === "Err") {
            response.responseCode = HttpCode.UNAUTHORIZED;
            response.responseMessage = validOTP.msg;
            throw "Failure validating OTP.";
        }

        let pinRes = await setPinForUserId(user.id, pin, OTP_TYPES.SET_PIN.NAME);
        if (!pinRes) {
            response.responseCode = HttpCode.NO_CONTENT;
            response.responseMessage = HTTP_MESSAGE.NO_CONTENT;
            throw "Error in fn::setPin No Data";
        }

        let loginToken = jwt.sign(
            {
                userId: Number(user.id.toString()),
                userEmail: user.email,
                hasPin: pinRes.pin ? true : false,
                isVerified: user.is_verified
            },
            process.env.JWT_TOKEN
        )

        let sessionToken = jwt.sign(
            {
                userId: Number(user.id.toString()),
                userEmail: user.email
            },
            process.env.JWT_TOKEN
        )

        response.data = {
            userId: (pinRes.id).toString(),
            userEmail: pinRes.email,
            userPin: pinRes.pin,
            loginToken,
            pinToken: sessionToken
        }

        response.responseCode = HttpCode.SUCCESS;
        response.responseMessage = "PIN set successfully";   
        return response; 
    }catch(err){
        console.log(err ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);
        return response; 
    }    
}