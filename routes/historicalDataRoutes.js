import express from 'express'
import { compareNiftyWithStrategy, getHistoricalMonthlyOHLCVData, getHistoricalMonthlyOHLCVDataNifty, getNifty50IndexData, stopLossStrategy } from '../controller/historicaldataController.js'

export const historicalDataRouter = express.Router()

historicalDataRouter.get('/monthly', getHistoricalMonthlyOHLCVData)
historicalDataRouter.get('/nifty/monthly', getHistoricalMonthlyOHLCVDataNifty)
historicalDataRouter.get('/nifty/index', getNifty50IndexData)
historicalDataRouter.get('/graphs', compareNiftyWithStrategy)
historicalDataRouter.get('/daily', stopLossStrategy)