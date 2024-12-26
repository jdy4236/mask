// src/lib/authSocket.js

import jwt from 'jsonwebtoken';

export function authenticateSocket(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.userId;
    } catch (error) {
        console.error("Socket authentication failed:", error);
        return null;
    }
}
