// src/app/api/auth/verify-token/route.js

import { authenticate } from '@/lib/auth';

export async function POST(req) {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader && authHeader.split(" ")[1];

    const userId = authenticate(token); // JWT 인증

    if (userId) {
        return new Response(JSON.stringify({ valid: true, userId }), { status: 200 });
    } else {
        return new Response(JSON.stringify({ valid: false }), { status: 401 });
    }
}
