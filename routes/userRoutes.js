import express from 'express'
import { getUserProfile } from '../controller/userController.js'

export const userRouter = express.Router()

userRouter.get('/profile', getUserProfile)