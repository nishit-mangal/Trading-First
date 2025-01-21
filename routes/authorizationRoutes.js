import express from 'express'
import { generateAccessToken, googleCodeAuth, verifyToken } from '../controller/authorizationController.js'

export const appAuthRouter = express.Router()

appAuthRouter.get('/generateAccessToken', generateAccessToken);
appAuthRouter.post("/verifyToken",verifyToken);
appAuthRouter.get("/googleAuth", googleCodeAuth);