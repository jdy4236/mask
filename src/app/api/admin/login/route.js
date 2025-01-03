// src/app/api/admin/login/route.js

import prisma from '@/lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        // 이메일과 비밀번호가 제공되었는지 확인
        if (!email || !password) {
            return new Response(JSON.stringify({ error: "Email and password are required" }), { status: 400 });
        }

        // 이메일로 사용자 찾기
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, nickname: true, password: true, role: true },
        });

        // 사용자가 존재하지 않거나 비밀번호가 일치하지 않는 경우
        if (!user) {
            return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
        }

        // 사용자가 관리자(role: 'admin')인지 확인
        if (user.role !== 'admin') {
            return new Response(JSON.stringify({ error: "Access denied" }), { status: 403 });
        }

        // JWT 토큰 생성 (role 포함)
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // 성공적으로 로그인하면 토큰과 닉네임 반환
        return new Response(JSON.stringify({ token, nickname: user.nickname }), { status: 200 });
    } catch (error) {
        console.error("Admin login error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
