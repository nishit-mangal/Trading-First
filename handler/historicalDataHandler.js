import { headers } from "../Constants/authorizationConst.js";
import { niftyArray } from "../Constants/niftyCompanies.js";
import axios from "axios";
import { callApiToGetScriptDataInADateRange } from "./apiContainer.js";

export function filterHistoricalData(candles) {
  // console.log(candles)
  let filteredArr = [];
  for (let candle of candles) {
    const parsedDate = new Date(candle[0]);
    let tempObj = {};
    tempObj.date = parsedDate.toISOString().split("T")[0];
    tempObj.closePrice = candle[4];
    tempObj.openPrice = candle[1];
    tempObj.greenCandle = candle[4] - candle[1] >= 0 ? true : false;
    filteredArr.push(tempObj);
  }
  return filteredArr;
}

export function probOfNextMonthIncresingGivenPrevnIncrease(monthPriceArr, n) {
  if (n === 0) return 0.0;
  let sampleSize = 0;
  let thisMonthHasIncreased = 0;
  for (let i = 0; i < monthPriceArr.length - n; i++) {
    const subArr = monthPriceArr.slice(i + 1, i + n + 1);
    let isConsiderable = isPrevnMonthsGreen(subArr);
    if (isConsiderable) {
      sampleSize++;
      if (monthPriceArr[i].greenCandle) {
        console.log(monthPriceArr[i].date);
        thisMonthHasIncreased++;
      }
    }
  }
  if (sampleSize === 0) {
    return 0.0;
  }

  let response = {
    totalSampleSize: monthPriceArr.length - 1,
    favSampleSize: sampleSize,
    successCases: thisMonthHasIncreased,
    probability: (thisMonthHasIncreased / sampleSize) * 100,
  };
  return response;
}

function isPrevnMonthsGreen(subArray) {
  for (let ele of subArray) {
    if (ele.greenCandle === false) {
      // console.log("Failed Scenarios: " ,ele.date)
      return false;
    }
  }
  // console.log("Success Scenarios: " ,subArray)
  return true;
}

async function callApiToGetNiftyData(to, from, candleTenure) {
  let niftyDataArr = [];
  for (let stock of niftyArray) {
    // console.log("Fetching Data for: ", stock);
    const instrument_key = `NSE_EQ|${stock.isin}`;
    const interval = candleTenure;
    const to_date = to;
    const from_date = from;

    let candleForStock = await callApiToGetScriptDataInADateRange(
      instrument_key,
      interval,
      to_date,
      from_date
    );
    if (!candleForStock) continue;
    stock.monthlyData = candleForStock;
    niftyDataArr.push(stock);
  }
  return niftyDataArr;
}

function bestPerformingStockInAMonth(niftyArr) {
  if (!niftyArr) {
    return null;
  }

  let stockOfTheMonthMap = new Map();
  let stockReturnObj = {
    name: "",
    return: 0.0,
  };

  for (let stock of niftyArr) {
    let monthsData = stock.monthlyData;
    for (let month of monthsData) {
      stockReturnObj = {
        name: stock.name,
        return: ((month[4] - month[1]) / month[1]) * 100,
      };
      const dateMod = new Date(month[0]);
      const parsedDate = `${dateMod.getFullYear()}-${
        dateMod.getMonth() + 1
      }-${dateMod.getDate()}`;
      let prevDataPoint = stockOfTheMonthMap.get(parsedDate);
      let modifiedArr = putNewDataPoint(prevDataPoint, stockReturnObj, 20);
      stockOfTheMonthMap.set(parsedDate, modifiedArr);
    }
  }

  // stockOfTheMonthMap.forEach((value, key) => {
  //   console.log(`Key: ${key} Value: `, value);
  // });

  return stockOfTheMonthMap;
}

function putNewDataPoint(arr, dataPoint, numOfBestStocksNeeded) {
  if (!arr) {
    let newArr = [];
    newArr.push(dataPoint);
    // console.log("Arr not defined", newArr)
    return newArr;
  }
  let newArr = arr;
  if (newArr.length < numOfBestStocksNeeded) {
    arr.push(dataPoint);
    return newArr;
  }

  for (let i = newArr.length - 1; i >= 0; i--) {
    if (newArr[i].return < dataPoint.return) {
      // console.log("Replaced",arr[i] , dataPoint)
      newArr[i] = dataPoint;
      break;
    }
  }
  arr.sort(function (a, b) {
    return b.return - a.return;
  });
  return newArr;
}

function mapCompanyMonthlyReturns(niftyArr) {
  let mapOfCompany = new Map();
  let mapArr = [];

  for (let stock of niftyArr) {
    mapArr = [];
    let monthsData = stock.monthlyData;
    for (let month of monthsData) {
      let monthObj = {
        date: "",
        return: 0.0,
      };
      monthObj.return = ((month[4] - month[1]) / month[1]) * 100;
      const dateMod = new Date(month[0]);
      const parsedDate = `${dateMod.getFullYear()}-${
        dateMod.getMonth() + 1
      }-${dateMod.getDate()}`;

      monthObj.date = parsedDate;
      mapArr.push(monthObj);
    }
    mapOfCompany.set(stock.name, mapArr);
  }
  return mapOfCompany;
}

export function tradingStrategy(
  arrayOfBestPerformingStocks,
  companyReturnsMap
) {
  // console.log("Company Returns Map:", companyReturnsMap);
  let portfolio = [];
  let portfolioMonthlyReturns = [];
  let prevPortfolio;
  for (let bestStocks of arrayOfBestPerformingStocks) {
    if (portfolio.length === 0) {
      // console.log("Starting month: ", bestStocks[0]);
      portfolio.push(bestStocks[1]);
      continue;
    }

    console.log("\n\nThis Month:", bestStocks[0]);

    let newPortfolio = [];
    let monthlyReturns = 0.0;
    prevPortfolio = portfolio[portfolio.length - 1];
    console.log("Pre Portfolio:", prevPortfolio);

    let thisMonthRet = rearrangePrevMonthPortfolio(
      prevPortfolio,
      bestStocks[0],
      companyReturnsMap
    );
    console.log("This Month Perf: ", thisMonthRet);

    for (let i = 0; i < 20; i++) {
      monthlyReturns += thisMonthRet[i].return;
      if (i < 14) {
        let newPortfolioObj = {};
        newPortfolioObj.name = thisMonthRet[i].name;
        newPortfolioObj.return = thisMonthRet[i].return;
        newPortfolio.push(newPortfolioObj);
      }
    }
    // console.log("Monthly Ret: ", monthlyReturns/6)
    portfolioMonthlyReturns.push(monthlyReturns / 20);

    // console.log("Best Stocks: ")
    for (let i = 0; i < 6; i++) {
      newPortfolio.push(bestStocks[1][i]);
      console.log(bestStocks[1][i]);
    }
    portfolio.push(newPortfolio);
  }

  return portfolioMonthlyReturns;
}

export function rearrangePrevMonthPortfolio(prevPortfolio, month, stockMap) {
  if (!prevPortfolio) {
    return null;
  }
  let sortedPortfolio = [];
  let monthlyReturnsArray;
  for (let i = 0; i < prevPortfolio.length; i++) {
    monthlyReturnsArray = stockMap.get(prevPortfolio[i].name);
    for (let monthReturn of monthlyReturnsArray) {
      if (monthReturn.date === month) {
        monthReturn.name = prevPortfolio[i].name;
        sortedPortfolio.push(monthReturn);
      }
    }
  }

  sortedPortfolio.sort(function (a, b) {
    return b.return - a.return;
  });
  return sortedPortfolio;
}

export async function returnsForStrategyArray() {
  let response = await callApiToGetNiftyData(
    "2024-01-01",
    "2013-11-04",
    "month"
  );
  if (!response) {
    console.log("resp", response);
    return "Error occured while fetching monthly data for nifty.";
  }

  let dataSelectingStocks = bestPerformingStockInAMonth(response);
  let mapOfCompanyReturns = mapCompanyMonthlyReturns(response);
  console.log("Best Performing Stocks", dataSelectingStocks.get("2024-1-1"));
  console.log("Map Of company Returns TCS", mapOfCompanyReturns.get("TCS"));
  let arrayOfDataSelectingStocks = Array.from(
    dataSelectingStocks.entries()
  ).reverse();
  // console.log("Array", arrayOfDataSelectingStocks[0])
  // console.log("Map", mapOfCompanyReturns)
  let portfolio = tradingStrategy(
    arrayOfDataSelectingStocks,
    mapOfCompanyReturns
  );
  // console.log("Portfoilo length:", portfolio.length);
  // console.log("Portfoilo:", portfolio)
  let start = 100;
  let i = 1;
  let count = 0;
  let avgRet = 0;
  for (let monthReturn of portfolio) {
    // if(monthReturn<-10){
    //   monthReturn = -10
    // }
    monthReturn /= 100;

    let ret = 1 + monthReturn;
    start *= ret;
    if (monthReturn <= -0.1) {
    }
    count++;
    avgRet += monthReturn;
    console.log(i, "Start: ", start, "Month Ret: ", monthReturn);
    i++;
  }
  console.log("Avg Return:", avgRet / count);
  console.log("Return", start);
  console.log("Count", count);
  return portfolio.splice(portfolio.length - 112, 112);
}

export async function generateStrategyDataAndcompareNifty() {
  const strategyArrayData = await returnsForStrategyArray();
  let niftyFiftyArrayData = await fetchNiftyDataAndReturnMonthlyReturns();
  niftyFiftyArrayData = niftyFiftyArrayData.reverse();
  // console.log("Stragtegy Array: ", strategyArrayData)
  // console.log("Nifty Array: ", niftyFiftyArrayData)
  let data = {
    niftyArray: [],
    strategyArray: [],
  };

  let startNifty = 100;
  let startStrategy = 100;

  for (let i = 0; i < 112; i++) {
    let tempStrategyObj = {};
    let tempNiftyObj = {};
    startNifty *= 1 + niftyFiftyArrayData[i];
    tempNiftyObj.x = i + 1;
    tempNiftyObj.y = startNifty;
    console.log(tempNiftyObj, ",");
    data.niftyArray.push(tempNiftyObj);

    startStrategy *= 1 + strategyArrayData[i] / 100;
    tempStrategyObj.x = i + 1;
    tempStrategyObj.y = startStrategy;
    data.strategyArray.push(tempStrategyObj);
  }

  console.log("Nifty Array Length", niftyFiftyArrayData.length);
  console.log("Strategy Array Length", strategyArrayData.length);
  return data;
}

export async function fetchNiftyMonthlyData() {
  const instrument_key = "NSE_INDEX|Nifty%2050";
  const interval = "month";
  const to_date = "2023-11-03";
  const from_date = "2013-11-04";

  let niftyData = await callApiToGetScriptDataInADateRange(instrument_key, interval, to_date, from_date)
  
  return niftyData ? niftyData : null
  // try {
  //   const historicalData = await axios(config);
  //   // console.log(historicalData.data.data);
  //   return historicalData.data.data;
  // } catch (err) {
  //   console.log(err.response?.data ?? err);
  //   return null;
  // }
}

async function fetchNiftyDataAndReturnMonthlyReturns() {
  const niftyData = await fetchNiftyMonthlyData();
  // console.log("nifty Data: ", niftyData)
  let niftyReturnArray = [];
  for (let candle of niftyData.candles) {
    let returns = 0.0;
    returns = (candle[4] - candle[1]) / candle[1];
    niftyReturnArray.push(returns);
  }
  // console.log("Return", start);
  return niftyReturnArray.splice(0, 112);
}

/******************############     implementation of stop loss strategy        ############********************/

export async function fetchDataAndImplementstopLossStrategyDaily() {
  // fetch monthly data for all 50 stocks from december 2018 till december 2023. Select top 20 stocks from dec 2018 and put in portfolio
  let monthlyData = await callApiToGetNiftyData(
    "2024-01-01",
    "2018-12-01",
    "month"
  );
  if (!monthlyData) {
    console.log("resp", monthlyData);
    return res.send("Error occured while fetching monthly data for nifty.");
  }

  let dataSelectingStocks = bestPerformingStockInAMonth(monthlyData);
  let arrayOfDataSelectingStocks = Array.from(
    dataSelectingStocks.entries()
  ).reverse();
  // console.log(arrayOfDataSelectingStocks[arrayOfDataSelectingStocks.length-1])

  let mapOfCompanyReturnsMonthly = mapCompanyMonthlyReturns(monthlyData);

  // fetch daily data for all 50 stocks from 01.01.2019 till 31.12.2023
  let weeklyData = await callApiToGetNiftyData(
    "2024-01-01",
    "2018-12-01",
    "week"
  );
  if (!weeklyData) {
    console.log("resp", weeklyData);
    return res.send("Error occured while fetching monthly data for nifty.");
  }
  // console.log(weeklyData[0])

  let mapOfCompanyReturnsWeekly = mapCompanyMonthlyReturns(weeklyData); //tum mujeh stock do, me tumhe weekly returns doonga
  stopLossTradingStrategy(
    arrayOfDataSelectingStocks,
    mapOfCompanyReturnsWeekly,
    mapOfCompanyReturnsMonthly
  );

  // console.log(mapOfCompanyReturnsWeekly)

  // calculate running daily returns for portfolio and implement relevant stop loss logic
  return dataSelectingStocks;
}

function stopLossTradingStrategy(
  bestPerformingStocksMonthlyArr,
  mapOfCompanyReturnsWeekly,
  mapOfCompanyReturnsMonthly
) {
  let portfolio = [];
  let portfolioMonthlyReturns = [];
  let prevPortfolio;
  for (let bestStocks of bestPerformingStocksMonthlyArr) {
    if (portfolio.length === 0) {
      console.log("Starting month: ", bestStocks[0]);
      portfolio.push(bestStocks[1]);
      continue;
    }
    // console.log("\n\nThis Month:", bestStocks[0]);

    let newPortfolio = [];
    let monthlyReturns = 0.0;
    prevPortfolio = portfolio[portfolio.length - 1];
    // console.log("Pre Portfolio:", prevPortfolio)

    //weekly returns calculation
    let response = stopLossHit(
      prevPortfolio,
      bestStocks[0],
      mapOfCompanyReturnsWeekly
    );

    if (response.stopLossWasHit) {
      portfolio.push(newPortfolio);
    }

    let thisMonthRet = rearrangePrevMonthPortfolio(
      prevPortfolio,
      bestStocks[0],
      mapOfCompanyReturnsMonthly
    );
    // console.log("This Month Perf: ", thisMonthRet)

    for (let i = 0; i < 20; i++) {
      monthlyReturns += thisMonthRet[i].return;
      if (i < 14) {
        let newPortfolioObj = {};
        newPortfolioObj.name = thisMonthRet[i].name;
        newPortfolioObj.return = thisMonthRet[i].return;
        newPortfolio.push(newPortfolioObj);
      }
    }
    // console.log("Monthly Ret: ", monthlyReturns/6)
    portfolioMonthlyReturns.push(monthlyReturns / 20);

    // console.log("Best Stocks: ")
    for (let i = 0; i < 6; i++) {
      newPortfolio.push(bestStocks[1][i]);
      // console.log(bestStocks[1][i])
    }
    portfolio.push(newPortfolio);
  }

  return portfolioMonthlyReturns;
}

function stopLossHit(prevPortfolio, month, weeklyReturnsMap) {
  if (!prevPortfolio) {
    return null;
  }
  let sortedPortfolio = [];
  let monthlyReturnsArray;
  let weeklyReturns = [];
  let responseObj = {
    stopLossWasHit: false,
    percentLoss: 0.0,
    opportunityCost: 0.0,
  };

  for (let i = 0; i < prevPortfolio.length; i++) {
    monthlyReturnsArray = weeklyReturnsMap.get(prevPortfolio[i].name);
    monthlyReturnsArray = monthlyReturnsArray.reverse();

    let givenMonthArray = month.split("-");
    let tempReturnArr = [];
    for (let monthReturn of monthlyReturnsArray) {
      let currentMonthArr = monthReturn.date.split("-");
      if (
        currentMonthArr[0] === givenMonthArray[0] &&
        currentMonthArr[1] === givenMonthArray[1]
      ) {
        // monthReturn.name = prevPortfolio[i].name;
        // sortedPortfolio.push(monthReturn);
        tempReturnArr.push(monthReturn.return);
      }
    }
    weeklyReturns.push(tempReturnArr);
  }

  let totalWeeklyReturns = 0;
  let numOfWeeks = weeklyReturns[0].length;
  let j = 0;
  while (numOfWeeks !== j) {
    let netWeeklyReturns = 0;
    for (let i = 0; i < weeklyReturns.length; i++) {
      netWeeklyReturns += weeklyReturns[i][j];
    }
    netWeeklyReturns /= 20;
    console.log();
    totalWeeklyReturns += netWeeklyReturns;

    if (totalWeeklyReturns < -10.0) {
      responseObj.stopLossWasHit = true;
      responseObj.percentLoss = totalWeeklyReturns;
      console.log("Stop loss was hit for:", month);
      // console.log("Weekly Array", weeklyReturns);
      console.log("Actual Loss:", totalWeeklyReturns);
      console.log("Weekly Loss:", netWeeklyReturns);
      return responseObj;
    }
    j++;
  }

  // sortedPortfolio.sort(function (a, b) {
  //   return b.return - a.return;
  // });
  return responseObj;
}
