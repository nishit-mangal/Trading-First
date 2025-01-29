export let financialYear = '2122'

export const pageSize = 5

export const HttpCode = {
    SUCCESS: '200',
    NO_CONTENT: "204",
    INTERNAL_SERVER_ERROR: '500',
    BAD_GATEWAY: '502',
    BAD_REQUEST: '400',
    UNAUTHORIZED: "401",
    CONFLICT: "409"
}
export const HTTP_MESSAGE = {
    INTERNAL_SERVER_ERROR: "Internal Server Error",
    UNAUTHORIZED: "Unauthorized",
    INVALID_INPUT: "Invalid Input",
    NO_CONTENT: "No content found to update"
};
export const CACHE_NAMES = {
    FUND_DETAILS: {
        NAME:"FUND_DETAILS",
        TTL:100
    },
    STOCK:{
        NAME:"STOCK",
        TTL:60*10
    },
    PORTFOLIO_HOLDINGS:{
        NAME:"PORTFOLIO_HOLDINGS",
        TTL:60*15
    },
}
export const OTP_TYPES = {
    EMAIL_VERIFICATION : {
        SUBJECT: "OTP to Verify Email",
        NAME: "EMAIL_VERIFICATION"
    },
    SET_PIN: {
        SUBJECT: "OTP to Set Pin",
        NAME: "SET_PIN"
    }
}