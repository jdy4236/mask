// src/lib/adminAuth.js

import jwt from 'jsonwebtoken';
import prisma from './prisma.js';

export async function verifyAdmin(token) {
    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, nickname: true, role: true },
        });
        if (user && user.role === 'admin') {
            return { userId: user.id, nickname: user.nickname, role: user.role };
        }
        return null;
    } catch (error) {
        console.error("관리자 인증 실패:", error.message);
        return null;
    }
}
