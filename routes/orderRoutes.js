import express from 'express'
import { buyStock } from '../controller/orderController.js'

export const orderRouter = express.Router()

orderRouter.post('/buy', buyStock)