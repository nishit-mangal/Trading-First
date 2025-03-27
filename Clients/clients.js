import { Redis } from "ioredis";
import {} from  'dotenv/config'

export const client = new Redis(process.env.REDIS_URL);
client.on("connecting", ()=>console.log("Connecting to redis instance..."));
client.on("connect", ()=>console.log("Redis connected..."));
client.on("error", (err)=>{
    console.log("Error occured while connecting Redis.");
    console.log(err);
})