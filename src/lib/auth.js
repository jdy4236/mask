// src/lib/auth.js

import jwt from 'jsonwebtoken';
import prisma from './prisma.js'; // Prisma 클라이언트 임포트

export async function authenticate(token) {
    if (!token) {
        console.log("No token provided");
        return null;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, nickname: true },
        });
        if (!user) {
            console.log("User not found");
            return null;
        }
        return { userId: user.id, nickname: user.nickname };
    } catch (error) {
        console.error("Authentication failed:", error.message);
        return null;
    }
}
