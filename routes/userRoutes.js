import express from 'express'
import { createUser, getFundDetails, getUserProfile, resendOTP, verifyEmail } from '../controller/userController.js'

export const userRouter = express.Router()

userRouter.get('/profile', getUserProfile)
userRouter.get('/funds', getFundDetails)
userRouter.post("/createUser", createUser);
userRouter.post("/validateOTP", verifyEmail);
userRouter.post("/resendOTP",resendOTP);