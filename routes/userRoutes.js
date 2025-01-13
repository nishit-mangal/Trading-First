import express from "express";
import {
  createUser,
  forgotPassword,
  getFundDetails,
  getUserDetails,
  getUserProfile,
  loginUser,
  resendOTP,
  resetForgotPassword,
  resetPassword,
  setAPIData,
  setPin,
  verifyEmail,
  verifyPin,
} from "../controller/userController.js";

export const userRouter = express.Router();
//TODO: make middleware to check if the user exist in the DB
userRouter.get("/profile", getUserProfile);
userRouter.get("/funds", getFundDetails);
userRouter.get("/getUser/:userId", getUserDetails);
userRouter.post("/createUser", createUser);
userRouter.post("/validateOTP", verifyEmail);
userRouter.post("/resendOTP", resendOTP);
userRouter.post("/login", loginUser);
userRouter.post("/setPin", setPin);
userRouter.post("/verifyPin", verifyPin);
userRouter.post("/forgotPassword", forgotPassword);
userRouter.post("/resetPassword", resetPassword);
userRouter.post("/resetForgotPassword", resetForgotPassword);
userRouter.post("/setAPISecrets", setAPIData);