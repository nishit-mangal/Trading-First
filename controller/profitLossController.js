import axios from "axios";
import { headers } from "../Constants/authorizationConst.js";
import { financialYear } from "../Constants/constants.js";

export async function calculateHoldings(req, resp) {
//   console.log("Inside the calculateHoldings");

  let pageSize = 50;
  try {
    let metadata = await apiToGetMetaData();
    if (!metadata || !metadata.page_size_limit) {
      throw "Unable to find page size. Setting default to 50";
    }
    console.log("Meta data in calculateHoldings", metadata)
    pageSize = metadata.page_size_limit ?? 50;
  } catch (err) {
    console.log(err);
  }

  const params = {
    segment: "EQ",
    financial_year: financialYear,
    page_number: 1,
    page_size:pageSize,
  };
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "https://api.upstox.com/v2/trade/profit-loss/data",
    headers: headers,
    params,
  };
  try {
    const portfolio = await axios(config);
    console.log(portfolio.data.data);
    return resp.json({ status: portfolio.data.status });
  } catch (err) {
    console.log(err.response.data ?? err);
    return resp.json({
      status: "Error",
      message: err,
    });
  }
}

export async function generateMetaData(req, res) {
    
    let metaDataRespose = await apiToGetMetaData();
    
    if (!metaDataRespose) {
        return res.json({
            status: "Error",
            message: "Meta Data Not Fetched Successfully",
        });
    }
    
    return res.json({ data: metaDataRespose });
}

async function apiToGetMetaData() {
    let params = {
      segment: "EQ",
      financial_year: financialYear,
    };
    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: "https://api.upstox.com/v2/trade/profit-loss/metadata",
      headers: headers,
      params,
    };
  try {
    const metadata = await axios(config);
    // console.log("Metadata API Response", metadata.data);
    return metadata.data.data;
  } catch (err) {
    console.log(err.response.data ?? err);
    return null;
  }
}
// trade/profit-loss/data?from_date=<string>&to_date=<string>&&=<integer>&=<integer>
