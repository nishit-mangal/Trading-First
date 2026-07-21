import { nifty50Companies, niftyArray } from "../Constants/niftyCompanies.js";
import { UNIT_VALUES } from "../Constants/upstoxAPIConstants.js";
import {
	ICandleForStock,
	IStockDateReturn,
	IStockNameDateReturn,
	IStockNameReturn
} from "../interfaces/historicalDataHandler.js";
import type { INifty50Companies } from "../interfaces/niftyCompaniesInterfaces.js";
import { callApiToGetHistoricalData } from "./apiContainer.js";

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
	for (let stock of niftyArray as any) {
		// console.log("Fetching Data for: ", stock);
		const instrument_key = `NSE_EQ|${stock.isin}`;
		const interval = candleTenure;
		const to_date = to;
		const from_date = from;

		let candleForStock = await callApiToGetHistoricalData(
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

			let stockReturnObj: IStockNameReturn = {
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

	let mapOfCompany = new Map<string, IStockDateReturn[]>();

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
	dateCompanyReturnArray: [string, IStockNameReturn[]][],
	companyDateReturnsMap: Map<string, IStockDateReturn[]>
) {
	const BUCKET_SIZE: number = 10,
		KEEPING_SIZE = 4;
	let portfolio: IStockNameReturn[][] = [];
	let portfolioMonthlyReturns: IStockDateReturn[] = [];
	for (let bestStocks of dateCompanyReturnArray) {
		if (portfolio.length === 0) {
			portfolio.push(bestStocks[1].slice(0, BUCKET_SIZE));
			continue;
		}

		let prevPortfolio: IStockNameReturn[] = portfolio[portfolio.length - 1];
		const previousPorfolioStockNames: string[] = prevPortfolio.map(
			(p: IStockNameReturn) => p.name
		);
		let thisMonthRet: IStockNameDateReturn[] = rearrangePrevMonthPortfolio(
			previousPorfolioStockNames,
			bestStocks[0],
			companyDateReturnsMap
		);

		let monthlyReturns = 0.0;
		let newPortfolio: IStockNameReturn[] = [];
		for (let i = 0; i < BUCKET_SIZE; i++) {
			monthlyReturns += thisMonthRet[i].return;
			if (i < KEEPING_SIZE) {
				let newPortfolioObj: IStockNameReturn = {
					name: thisMonthRet[i].name,
					return: thisMonthRet[i].return
				};
				newPortfolio.push(newPortfolioObj);
			}
		}
		const monthReturn: IStockDateReturn = {
			date: bestStocks[0],
			return: monthlyReturns / BUCKET_SIZE
		};
		portfolioMonthlyReturns.push(monthReturn);

		for (let i = 0; i < BUCKET_SIZE - KEEPING_SIZE; i++)
			newPortfolio.push(bestStocks[1][i]);

		portfolio.push(newPortfolio);
	}

	return portfolioMonthlyReturns;
}

function rearrangePrevMonthPortfolio(
	previousPorfolioStockNames: string[],
	month: string,
	companyDateReturnsMap: Map<string, IStockDateReturn[]>
) {
	if (previousPorfolioStockNames.length === 0) {
		return null;
	}
	let sortedPortfolio: IStockNameDateReturn[] = [];
	for (let i = 0; i < previousPorfolioStockNames.length; i++) {
		let monthlyReturnsArray: IStockDateReturn[] = companyDateReturnsMap.get(
			previousPorfolioStockNames[i]
		);
		for (let monthReturn of monthlyReturnsArray as IStockNameDateReturn[]) {
			if (monthReturn.date === month) {
				monthReturn.name = previousPorfolioStockNames[i];
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
	let mapOfCompanyReturns: Map<string, IStockDateReturn[]> =
		mapCompanyMonthlyReturns(response);
	console.log("Best Performing Stocks", dataSelectingStocks.get("2024-1-1"));
	// console.log("Map Of company Returns TCS", mapOfCompanyReturns.get("TCS"));
	let arrayOfDataSelectingStocks: any = Array.from(
		dataSelectingStocks.entries()
	).reverse();
	// console.log("Array", arrayOfDataSelectingStocks[0])
	// console.log("Map", mapOfCompanyReturns)
	let portfolio: any[] = tradingStrategy(
		arrayOfDataSelectingStocks,
		mapOfCompanyReturns
	);
	// console.log("Portfoilo length:", portfolio.length);
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

export async function generateStrategyDataAndcompareNifty(
	fromDate: string,
	toDate: string
) {
	const strategyArrayData: IStockDateReturn[] = await returnsForStrategyArrayV2(
		toDate,
		fromDate
	);
	let niftyFiftyArrayData: IStockDateReturn[] =
		await fetchNifty50MonthlyReturns(toDate, fromDate);
	niftyFiftyArrayData = niftyFiftyArrayData.slice(
		1,
		niftyFiftyArrayData.length
	);

	let data = {
		niftyArray: [],
		strategyArray: []
	};

	let startNifty = 100;
	let startStrategy = 100;

	for (
		let i = 0;
		i < Math.min(strategyArrayData.length, niftyFiftyArrayData.length);
		i++
	) {
		startNifty *= 1 + niftyFiftyArrayData[i].return / 100;
		let tempNiftyObj: any = {};
		tempNiftyObj.x = i + 1;
		tempNiftyObj.y = startNifty;
		data.niftyArray.push(tempNiftyObj);

		startStrategy *= 1 + strategyArrayData[i].return / 100;
		let tempStrategyObj: any = {};
		tempStrategyObj.x = i + 1;
		tempStrategyObj.y = startStrategy;
		data.strategyArray.push(tempStrategyObj);
	}

	return data;
}

export async function fetchNiftyMonthlyData(
	to_date: string,
	from_date: string
) {
	const instrument_key = "NSE_INDEX|Nifty%2050";
	const interval = UNIT_VALUES.MONTHS;
	let niftyData: any[] = await callApiToGetHistoricalData(
		instrument_key,
		interval,
		to_date,
		from_date
	);
	if (niftyData.length === 0)
		throw new Error(
			"Error in fn::fetchNiftyMonthlyData.\nNo nifty fifty data received."
		);
	return niftyData;
}

async function fetchNifty50MonthlyReturns(toDate: string, fromDate: string) {
	let niftyData: any[] = await fetchNiftyMonthlyData(toDate, fromDate);
	niftyData = niftyData.reverse();

	let niftyReturnArray: IStockDateReturn[] = [];
	for (let i = 0; i < niftyData.length; i++) {
		const candle = niftyData[i];

		const dateMod = new Date(candle[0]);
		const parsedDate = `${dateMod.getFullYear()}-${
			dateMod.getMonth() + 1
		}-${dateMod.getDate()}`;
		const final = candle[4];
		const intial = i > 0 ? niftyData[i - 1][4] : candle[1];
		const returnObj: IStockDateReturn = {
			date: parsedDate,
			return: ((final - intial) / intial) * 100
		};
		niftyReturnArray.push(returnObj);
	}
	return niftyReturnArray;
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
				let newPortfolioObj: any = {};
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

export async function returnsForStrategyArrayV2(
	startDate: string,
	endDate: string,
	backtrackingTenure: number = 3
) {
	let response: ICandleForStock[] = await getNiftyCompaniesDataV2(
		startDate,
		endDate,
		UNIT_VALUES.MONTHS,
		backtrackingTenure
	);
	if (response.length === 0)
		throw new Error(
			`Error in fn::returnsForStrategyArrayV2. \n No candle data received for nifty fifty companies.`
		);

	let dataSelectingStocks: Map<string, IStockNameReturn[]> =
		bestPerformingStockInAMonth(response);
	let mapOfCompanyReturns: Map<string, IStockDateReturn[]> =
		mapCompanyMonthlyReturns(response);
	const arrayOfDataSelectingStocks: [string, IStockNameReturn[]][] = Array.from(
		dataSelectingStocks.entries()
	);
	let portfolio: IStockDateReturn[] = tradingStrategy(
		arrayOfDataSelectingStocks,
		mapOfCompanyReturns
	);
	// console.log("portfolio:", portfolio);
	let start = 100;
	let i = 1;
	let count = 0;
	let avgRet = 0;
	for (let monthReturn of portfolio as IStockDateReturn[]) {
		let returns = monthReturn.return / 100;

		let ret = 1 + returns;
		start *= ret;
		count++;
		avgRet += returns;
		i++;
	}
	// console.log("Avg Return:", avgRet / count);
	// console.log("Return", start);
	// return portfolio.splice(portfolio.length - 112, 112);
	return portfolio;
}

async function getNiftyCompaniesDataV2(
	to: string,
	from: string,
	candleTenure: string,
	backtrackingYears: number = 3
) {
	const companySet = backtrackingYears === 3 ? nifty50Companies : niftyArray;
	const results: PromiseSettledResult<ICandleForStock>[] =
		await Promise.allSettled(
			companySet.map(async (stock: INifty50Companies) => {
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
