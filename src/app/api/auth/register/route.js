// src/app/api/auth/register/route.js

import prisma from '@/lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(request) {
    const { nickname, email, password } = await request.json();

    if (!nickname || !email || !password) {
        return new Response(JSON.stringify({ error: 'All fields are required.' }), { status: 400 });
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.create({
            data: {
                nickname,
                email,
                password: hashedPassword,
            },
        });

        // JWT 생성 (nickname 포함)
        const token = jwt.sign({ userId: user.id, nickname: user.nickname }, process.env.JWT_SECRET, { expiresIn: '1h' });

        return new Response(JSON.stringify({ token, nickname: user.nickname }), { status: 201 });
    } catch (error) {
        if (error.code === 'P2002') {
            return new Response(JSON.stringify({ error: 'Email or nickname already exists.' }), { status: 409 });
        }
        return new Response(JSON.stringify({ error: 'Internal server error.' }), { status: 500 });
    }
}
