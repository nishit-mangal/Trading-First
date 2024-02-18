import express from 'express'
import { getFundDetails, getUserProfile } from '../controller/userController.js'

export const userRouter = express.Router()

userRouter.get('/profile', getUserProfile)
userRouter.get('/funds', getFundDetails)