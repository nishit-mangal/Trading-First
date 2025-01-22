export const resetLink = (link) => {
    return `
        <div>
            Reset link: ${link}
        </div>
    `
}

export const emailVerificationOTP = (otp) => {
    return `
        <h1>Please confirm your OTP for Email Verification</h1>
        <p>Here is your OTP code: ${otp}</p>
    `
}

export const setPinOTP = (otp) => {
    return `
        <h1>Please confirm your OTP for pin reset</h1>
        <p>Here is your OTP code: ${otp}</p>
    `
}