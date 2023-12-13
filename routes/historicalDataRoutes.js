import express from 'express'
import { getHistoricalMonthlyOHLCVData, getHistoricalMonthlyOHLCVDataNifty } from '../controller/historicaldataController.js'

export const hostoricalDataRouter = express.Router()

hostoricalDataRouter.get('/monthly', getHistoricalMonthlyOHLCVData)
hostoricalDataRouter.get('/nifty/monthly', getHistoricalMonthlyOHLCVDataNifty)