// src/lib/auth.js

import jwt from 'jsonwebtoken';
import prisma from './prisma.js';

export async function authenticate(token) {
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, nickname: true, role: true }, // role 포함
        });

        if (user) {
            return {
                userId: user.id, // 'userId' 필드 추가
                nickname: user.nickname,
                role: user.role,
            };
        }

        return null;
    } catch (error) {
        console.error("Authentication error:", error);
        return null;
    }
}
