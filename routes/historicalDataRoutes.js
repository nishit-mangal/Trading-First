import express from 'express'
import { getHistoricalMonthlyOHLCVData } from '../controller/historicaldataController.js'

export const hostoricalDataRouter = express.Router()

hostoricalDataRouter.get('/monthly', getHistoricalMonthlyOHLCVData)