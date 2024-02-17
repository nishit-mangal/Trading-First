import express from 'express'
import { calculateHoldings, generateMetaData } from '../controller/profitLossController.js'

export const profitLossRouter = express.Router() 

profitLossRouter.get('/xirrCalculation', calculateHoldings)
profitLossRouter.get('/reportMetaData', generateMetaData)