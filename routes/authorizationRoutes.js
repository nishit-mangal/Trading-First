import express from 'express'
import { generateAccessToken, verifyToken } from '../controller/authorizationController.js'

export const appAuthRouter = express.Router()

appAuthRouter.get('/generateAccessToken', generateAccessToken);
appAuthRouter.post("/verifyToken",verifyToken);