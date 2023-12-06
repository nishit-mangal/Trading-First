import axios from 'axios'
import { accessToken } from '../Constants/authorizationConst.js';

export async function getUserProfile(req, res){
    const headers = {
        "accept": 'application/json',
        "Api-Version":'2.0',
        "Content-Type":'application/x-www-form-urlencoded',
        "Authorization": `Bearer ${accessToken}`
    }
   
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: "https://api.upstox.com/v2/user/profile",
      headers: headers
    };
  
    try {
      const userData = await axios(config);
      console.log(userData.data);
      return res.json({status:userData.data.status, data:userData.data.data})
    } catch (err) {
      console.log(err.response.data);
      return res.json({status:"Error", message:err.response.data.errors[0].message})
    }
}