import express from 'express'
import { connectToWebsocket } from '../controller/webSocketController.js'

export const websocketRouter = express.Router()

websocketRouter.get('/', connectToWebsocket)