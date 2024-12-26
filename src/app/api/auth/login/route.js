// src/app/api/auth/login/route.js

import prisma from '@/lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(request) {
    const { email, password } = await request.json();

    if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password are required." }), { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return new Response(JSON.stringify({ error: "Invalid credentials." }), { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return new Response(JSON.stringify({ error: "Invalid credentials." }), { status: 401 });
        }

        const token = jwt.sign({ userId: user.id, nickname: user.nickname }, process.env.JWT_SECRET, { expiresIn: '1h' });

        return new Response(JSON.stringify({ token, nickname: user.nickname }), { status: 200 });
    } catch (error) {
        console.error("Login error:", error);
        return new Response(JSON.stringify({ error: "Login failed." }), { status: 500 });
    }
}
