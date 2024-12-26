// src/lib/auth.js

import jwt from 'jsonwebtoken';

export function authenticate(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.userId;
    } catch (error) {
        console.error("Authentication failed:", error);
        return null;
    }
}
