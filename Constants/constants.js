export let financialYear = '2122'

export const pageSize = 5

export const HttpCode = {
    SUCCESS: '200',
    INTERNAL_SERVER_ERROR: '500',
    BAD_GATEWAY: '502',
    BAD_REQUEST: '400'
}

export const CACHE_NAMES = {
    FUND_DETAILS: {
        NAME:"FUND_DETAILS",
        TTL:10
    },
    STOCK:{
        NAME:"STOCK",
        TTL:1000
    },
    PORTFOLIO_HOLDINGS:{
        NAME:"PORTFOLIO_HOLDINGS",
        TTL:1000
    },
}