import CryptoJS from "crypto-js";

export function encrypt(data){
    const cipherText = CryptoJS.AES.encrypt(data, process.env.ENCRYPTION_KEY).toString();
    return cipherText;
}