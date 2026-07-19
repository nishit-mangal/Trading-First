import { nifty50Companies, niftyArray } from "../Constants/niftyCompanies.js";
import { UNIT_VALUES } from "../Constants/upstoxAPIConstants.js";
import {
	ICandleForStock,
	IStockDateReturn,
	IStockNameReturn
} from "../interfaces/historicalDataHandler.js";
import type { INifty50Companies } from "../interfaces/niftyCompaniesInterfaces.js";
import {
	callApiToGetHistoricalData,
	callApiToGetScriptDataInADateRange
} from "./apiContainer.js";

export function filterHistoricalData(candles) {
	// console.log(candles)
	let filteredArr = [];
	for (let candle of candles) {
		const parsedDate = new Date(candle[0]);
		let tempObj: any = {};
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
				// console.log(monthPriceArr[i].date);
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
		probability: (thisMonthHasIncreased / sampleSize) * 100
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

function bestPerformingStockInAMonth(niftyArr: ICandleForStock[]) {
	if (niftyArr.length === 0)
		throw new Error(
			"Error in fn::bestPerformingStockInAMonth.\nNo data received in input."
		);

	let stockOfTheMonthMap = new Map<string, IStockNameReturn[]>();
	for (let stock of niftyArr) {
		let monthsData = [...stock.monthlyData];
		monthsData.reverse();
		for (let i = 0; i < monthsData.length; i++) {
			// Date, Open, High, Low, Close, Volume, NA
			const month = monthsData[i];

			const dateMod = new Date(month[0]);
			const parsedDate: string = `${dateMod.getFullYear()}-${
				dateMod.getMonth() + 1
			}-${dateMod.getDate()}`;

			const final = month[4],
				initial = i > 0 ? monthsData[i - 1][4] : month[1];
			const monthReturn = ((final - initial) / initial) * 100;

			let stockReturnObj: {
				name: string;
				return: number;
			} = {
				name: stock.name,
				return: monthReturn
			};
			let prevDataPoint = stockOfTheMonthMap.get(parsedDate);
			if (!prevDataPoint) prevDataPoint = [];
			prevDataPoint.push(stockReturnObj);
			stockOfTheMonthMap.set(parsedDate, prevDataPoint);
		}
	}

	for (const [date, arr] of stockOfTheMonthMap) {
		arr.sort((a, b) => b.return - a.return);
		stockOfTheMonthMap.set(date, arr);
	}

	return stockOfTheMonthMap;
}

function mapCompanyMonthlyReturns(niftyArr: ICandleForStock[]) {
	if (niftyArr.length === 0)
		throw new Error(
			"Error in fn::mapCompanyMonthlyReturns.\nNo data received in input."
		);

	let mapOfCompany = new Map();

	for (let stock of niftyArr) {
		let mapArr: IStockDateReturn[] = [];
		let monthsData = [...stock.monthlyData];
		monthsData.reverse();

		for (let i = 0; i < monthsData.length; i++) {
			const month = monthsData[i];

			const dateMod = new Date(month[0]);
			const parsedDate = `${dateMod.getFullYear()}-${
				dateMod.getMonth() + 1
			}-${dateMod.getDate()}`;

			const final = month[4],
				initial = i > 0 ? monthsData[i - 1][4] : month[1];
			const monthReturn = ((final - initial) / initial) * 100;

			let stockReturnObj: IStockDateReturn = {
				return: monthReturn,
				date: parsedDate
			};
			mapArr.push(stockReturnObj);
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
			portfolio.push(bestStocks[1].slice(0, 5));
			continue;
		}

		// console.log("\n\nThis Month:", bestStocks[0]);

		let newPortfolio = [];
		let monthlyReturns = 0.0;
		prevPortfolio = portfolio[portfolio.length - 1];
		// console.log("Pre Portfolio:", prevPortfolio);

		let thisMonthRet = rearrangePrevMonthPortfolio(
			prevPortfolio,
			bestStocks[0],
			companyReturnsMap
		);
		// console.log("This Month Perf: ", thisMonthRet);

		for (let i = 0; i < 5; i++) {
			monthlyReturns += thisMonthRet[i].return;
			if (i < 3) {
				let newPortfolioObj = {};
				newPortfolioObj.name = thisMonthRet[i].name;
				newPortfolioObj.return = thisMonthRet[i].return;
				newPortfolio.push(newPortfolioObj);
			}
		}
		// console.log("Monthly Ret: ", monthlyReturns/6)
		portfolioMonthlyReturns.push(monthlyReturns / 20);

		// console.log("Best Stocks: ")
		for (let i = 0; i < 2; i++) {
			newPortfolio.push(bestStocks[1][i]);
			// console.log(bestStocks[1][i]);
		}
		portfolio.push(newPortfolio);
	}

	return portfolioMonthlyReturns;
}

function rearrangePrevMonthPortfolio(prevPortfolio, month, stockMap) {
	if (!prevPortfolio) {
		return null;
	}
	let sortedPortfolio = [];
	for (let i = 0; i < prevPortfolio.length; i++) {
		let monthlyReturnsArray = stockMap.get(prevPortfolio[i].name);
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
	// console.log("Map Of company Returns TCS", mapOfCompanyReturns.get("TCS"));
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
			console.log("Negative return found");
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
		strategyArray: []
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
	const to_date = "2026-05-21";
	const from_date = "2016-11-04";

	let niftyData = await callApiToGetScriptDataInADateRange(
		instrument_key,
		interval,
		to_date,
		from_date
	);

	return niftyData ? niftyData : null;
}

async function fetchNiftyDataAndReturnMonthlyReturns() {
	const niftyData = await fetchNiftyMonthlyData();
	// console.log("nifty Data: ", niftyData)
	let niftyReturnArray = [];
	for (let candle of niftyData.candles) {
		let returns;
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
		throw new Error("Error occured while fetching monthly data for nifty.");
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
		throw new Error("Error occured while fetching monthly data for nifty.");
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
	// let sortedPortfolio = [];
	let monthlyReturnsArray;
	let weeklyReturns = [];
	let responseObj = {
		stopLossWasHit: false,
		percentLoss: 0.0,
		opportunityCost: 0.0
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

/***********************#############################################******************************** */

export async function returnsForStrategyArrayV2() {
	let response: ICandleForStock[] = await getNiftyCompaniesDataV2(
		"2026-07-20",
		"2023-08-01",
		UNIT_VALUES.MONTHS
	);
	if (response.length === 0)
		throw new Error(
			`Error in fn::returnsForStrategyArrayV2. \n No candle data received for nifty fifty companies.`
		);

	let dataSelectingStocks = bestPerformingStockInAMonth(response);
	let mapOfCompanyReturns = mapCompanyMonthlyReturns(response);
	const arrayOfDataSelectingStocks: [string, IStockNameReturn[]][] = Array.from(
		dataSelectingStocks.entries()
	);
	let portfolio = tradingStrategy(
		arrayOfDataSelectingStocks,
		mapOfCompanyReturns
	);
	// console.log("portfolio:", portfolio);
	return dataSelectingStocks;
	// // console.log("Portfoilo length:", portfolio.length);
	// // console.log("Portfoilo:", portfolio)
	// let start = 100;
	// let i = 1;
	// let count = 0;
	// let avgRet = 0;
	// for (let monthReturn of portfolio) {
	// 	// if(monthReturn<-10){
	// 	//   monthReturn = -10
	// 	// }
	// 	monthReturn /= 100;

	// 	let ret = 1 + monthReturn;
	// 	start *= ret;
	// 	if (monthReturn <= -0.1) {
	// 	}
	// 	count++;
	// 	avgRet += monthReturn;
	// 	console.log(i, "Start: ", start, "Month Ret: ", monthReturn);
	// 	i++;
	// }
	// console.log("Avg Return:", avgRet / count);
	// console.log("Return", start);
	// console.log("Count", count);
	// return portfolio.splice(portfolio.length - 112, 112);
}

async function getNiftyCompaniesDataV2(
	to: string,
	from: string,
	candleTenure: string
) {
	const results: PromiseSettledResult<ICandleForStock>[] =
		await Promise.allSettled(
			nifty50Companies.map(async (stock: INifty50Companies) => {
				const instrument_key = `NSE_EQ|${stock.isin}`;

				const candleForStock: any[] = await callApiToGetHistoricalData(
					instrument_key,
					candleTenure,
					to,
					from
				);
				if (candleForStock.length === 0)
					throw new Error(`Data not received for stock: ${stock.name}`);

				return {
					...stock,
					monthlyData: candleForStock
				};
			})
		);
	let niftyDataArr: ICandleForStock[] = [];
	results.forEach((result: PromiseSettledResult<ICandleForStock>) => {
		if (result.status === "fulfilled") {
			niftyDataArr.push(result.value);
			return;
		}
		console.warn(
			`Warn in fn::getNiftyCompaniesDataV2: ${
				result.reason?.message ?? result.reason
			}`
		);
	});
	return niftyDataArr;
}
