// src/app/api/admin/users/route.js

import { verifyAdmin } from '@/lib/adminAuth.js';
import prisma from '@/lib/prisma.js';
import bcrypt from 'bcrypt';

export async function POST(request) {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader && authHeader.split(" ")[1];
    const admin = await verifyAdmin(token);

    if (!admin) {
        return new Response(JSON.stringify({ error: "인증되지 않은 사용자입니다." }), { status: 401 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
        return new Response(JSON.stringify({ error: "이메일과 비밀번호는 필수입니다." }), { status: 400 });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return new Response(JSON.stringify({ error: "이미 존재하는 이메일입니다." }), { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                nickname: email.split('@')[0], // 필요에 따라 변경
                role: 'admin',
            },
        });

        return new Response(JSON.stringify({ message: "관리자 사용자가 성공적으로 생성되었습니다." }), { status: 201 });
    } catch (error) {
        console.error("관리자 사용자 생성 오류:", error);
        return new Response(JSON.stringify({ error: "내부 서버 오류." }), { status: 500 });
    }
}
