import { get1YearHighForAStock, sortHoldingData } from "../handler/portfolioHandler.js";
import { callApiToGetHoldings, callApiToGetScriptDataInADateRange } from "../handler/apiContainer.js";

export async function getHoldings(req, res) {
  try {
    let portfolioHoldings = await callApiToGetHoldings();
    if (!portfolioHoldings)
      throw { code: "502", msg: "Unable to fetch portfolio holdings." };

    let filteredHoldings = sortHoldingData(portfolioHoldings);
    // console.log(filteredHoldings);

    let to_date = (new Date().toISOString().split("T")[0]);
    let from_date = get1YearBeforeDate()
    
    let i=0
    for(let stock of filteredHoldings){
      if(i==0)
        console.log(stock)
      i++
      //fetch 1 year Data
      let oneYearData = await callApiToGetScriptDataInADateRange(stock.instrumentToken, 'day', to_date, from_date)
      if(!oneYearData){
        console.log(`Failed to fetch 1 year data for ${stock.companyName}`)
        continue
      }
      
      //process to get 1 year high
      let oneYearMax = get1YearHighForAStock(oneYearData)
      // console.log(`\nOneYear High for ${stock.companyName} is ${oneYearMax}`)
      stock.oneYearMax = oneYearMax

      //percentage down/up from 1year high
      let percentage = Math.floor(((stock.closingPrice - stock.oneYearMax)/stock.closingPrice)*100)
      // console.log(`Percentage for ${stock.companyName} is ${percentage}`)
      stock.percentFromMax = percentage
    }

    filteredHoldings.sort((a, b)=>{return a.percentFromMax-b.percentFromMax})
    return res.json({
      status: "Success",
      statusCode: "200",
      data: filteredHoldings,
    });
  } catch (err) {
    console.log(err);
    return res.json({
      status: "Error",
      statusCode: err.code ?? "500",
      data: err.msg ?? "Internal Server Error",
    });
  }
}

function get1YearBeforeDate(date) {
  if (!date) {
    date = new Date();
  }

  let oneYearAgo = new Date(date);
  oneYearAgo.setFullYear(date.getFullYear() - 1);

  // Handle February 29th for leap years
  if (
    date.getMonth() == 1 &&
    date.getDate() == 29 &&
    !isLeapYear(date.getFullYear() - 1)
  ) {
    oneYearAgo.setDate(28); // Change to February 28th for non-leap years
  }

  return oneYearAgo.toISOString().split("T")[0];
}

function isLeapYear(year) {
  return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
}
