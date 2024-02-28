import express from 'express'
import { buyStock, generateOrderHistory } from '../controller/orderController.js'

export const orderRouter = express.Router()

orderRouter.post('/trade', buyStock)
orderRouter.get('/orderHistory/:pageNumber', generateOrderHistory)