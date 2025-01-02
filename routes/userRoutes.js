import express from 'express'
import { createUser, forgotPassword, getFundDetails, getUserProfile, loginUser, resendOTP, resetForgotPassword, resetPassword, setPin, verifyEmail, verifyPin } from '../controller/userController.js'

export const userRouter = express.Router()

userRouter.get('/profile', getUserProfile)
userRouter.get('/funds', getFundDetails)
userRouter.post("/createUser", createUser);
userRouter.post("/validateOTP", verifyEmail);
userRouter.post("/resendOTP",resendOTP);
userRouter.post("/login", loginUser);
userRouter.post("/setPin", setPin);
userRouter.post("/verifyPin", verifyPin);
userRouter.post("/forgotPassword", forgotPassword);
userRouter.post("/resetPassword", resetPassword);
userRouter.post("/resetForgotPassword", resetForgotPassword);