export function sortHoldingData(holdingArr) {
  let filteredArr = [];
  for (let stock of holdingArr) {
    let tempStockObj = {
      companyName: stock.company_name,
      profit: stock.pnl,
      quantity: stock.quantity,
      averagePrice: stock.average_price,
    };
    filteredArr.push(tempStockObj);
  }
  return filteredArr;
}
