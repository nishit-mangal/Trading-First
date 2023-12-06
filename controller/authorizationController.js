import axios from "axios";
import { accessToken, apiKey, apiSecret, baseUrl, code, redirect_uri } from "../Constants/authorizationConst.js";

// TODO: write a code to save access token. Write it in a manner that the value is set on server start (if available)
// function setAccessToken(token){
//     accessToken = token
// }
// function getAccessToken(){
//     return accessToken
// }
export async function generateAccessToken(req, res) {
    const headers = {
        "accept": 'application/json',
        "Api-Version":'2.0',
        "Content-Type":'application/x-www-form-urlencoded'
    }
    const data = {
    code: code,
    client_id: apiKey,
    client_secret: apiSecret,
    redirect_uri: redirect_uri,
    grant_type: "authorization_code",
  };
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${baseUrl}/login/authorization/token`,
    headers: headers,
    data
  };

  try {
    const response = await axios(config)
    console.log(response.data);
    console.log("Access Token before: ", accessToken)
    if(response.data.access_token){
        // setAccessToken(response.data.access_token)
        console.log("Access Token generated: ", response.data.access_token)
        return res.json({ status: "Success", message:"AccessToken Successfully updated"});
    }
    else{
        return res.json({status:"Internal Server Error", message:"Access Token not received from vendor"})
    }    
  } catch (err) {
    console.log("Error", err.response?.data ?? err);
    return res.json({ status: "Error" , msg:err.response?.data.errors[0].message});
  }
}
