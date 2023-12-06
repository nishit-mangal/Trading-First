import express from 'express'
import { generateAccessToken } from '../controller/authorizationController.js'

export const appAuthRouter = express.Router()

appAuthRouter.get('/generateAccessToken', generateAccessToken)