import express from 'express'
import { getHoldings } from '../controller/portfolioController.js'

export const portfolioRouter = express.Router()

portfolioRouter.get('/getHoldings', getHoldings)