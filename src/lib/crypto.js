// src/lib/crypto.js

import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.CRYPTO_SECRET_KEY || 'your_crypto_secret_key';

export function encryptMessage(message) {
    return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
}

export function decryptMessage(cipherText) {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}
