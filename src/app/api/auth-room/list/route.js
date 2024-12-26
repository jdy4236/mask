// src/app/api/auth-room/list/route.js

import prisma from '@/lib/prisma.js';
import { authenticate } from '@/lib/auth.js';

export async function GET(request) {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader && authHeader.split(" ")[1];

    const user = await authenticate(token); // JWT 인증
    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    try {
        const userRooms = await prisma.room.findMany({
            where: { createdBy: user.userId }, // 요청자가 생성한 방
            select: {
                id: true,
                name: true,
                category: true,
                isPrivate: true,
                participantLimit: true,
                createdAt: true,
            },
        });

        const allRooms = await prisma.room.findMany({
            include: {
                creator: {
                    select: { nickname: true },
                },
            },
        });

        const formattedAllRooms = allRooms.map(room => ({
            id: room.id,
            name: room.name,
            category: room.category,
            isPrivate: room.isPrivate,
            participantLimit: room.participantLimit,
            createdAt: room.createdAt,
            creatorNickname: room.creator.nickname,
        }));

        return new Response(JSON.stringify({ userRooms, allRooms: formattedAllRooms }), { status: 200 });
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
}
