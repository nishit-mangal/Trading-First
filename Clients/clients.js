import { Redis } from "ioredis";
import {} from "dotenv/config";

export const redisClient = new Redis(process.env.REDIS_URL);
redisClient.on("connecting", () =>
	console.log("Connecting to redis instance...")
);
redisClient.on("connect", () => console.log("Redis connected..."));
redisClient.on("error", (err) => {
	console.log("Error occured while connecting Redis.");
	console.log(err);
});
