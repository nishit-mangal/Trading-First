import type { INifty50Companies } from "./niftyCompaniesInterfaces.js";

export interface ICandleForStock extends INifty50Companies {
	monthlyData: any[];
}

export interface IStockNameReturn {
	name: string;
	return: number;
}
export interface IStockDateReturn {
	date: string;
	return: number;
}
export interface IStockNameDateReturn extends IStockDateReturn {
	name: string;
}
