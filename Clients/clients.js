import { Redis } from "ioredis";
import {} from  'dotenv/config'

export const client = new Redis(process.env.REDIS_URL);