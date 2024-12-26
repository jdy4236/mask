// src/app/api/auth/login/route.js

import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(request) {
    const { email, password } = await request.json();

    if (!email || !password) {
        return new Response(JSON.stringify({ error: 'All fields are required.' }), { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return new Response(JSON.stringify({ error: 'Invalid credentials.' }), { status: 401 });
        }

        // JWT 생성
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        return new Response(JSON.stringify({ token }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error.' }), { status: 500 });
    }
}
