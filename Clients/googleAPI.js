import { google } from "googleapis";
import {} from "dotenv/config";

export const googleApiClient = new google.auth.OAuth2(
  process.env.GOOGLE_API_CLIENT_ID,
  process.env.GOOGLE_API_SECRET,
  process.env.FRONT_END_URL
);
