// src/app/api/auth-room/list/route.js

import prisma from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function GET(req) {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader && authHeader.split(" ")[1];

    const userId = authenticate(token); // JWT 인증
    if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const userRooms = await prisma.room.findMany({
            where: { createdBy: userId }, // 요청자가 생성한 방
        });

        const allRooms = await prisma.room.findMany(); // 모든 방

        return new Response(JSON.stringify({ userRooms, allRooms }), { status: 200 });
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
}
