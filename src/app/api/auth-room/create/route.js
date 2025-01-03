// src/app/api/auth-room/create/route.js

import prisma from '@/lib/prisma.js';
import { authenticate } from '@/lib/auth.js';
import eventEmitter from '@/lib/eventEmitter.js'; // 이벤트 익스포터 임포트

export async function POST(request) {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader && authHeader.split(" ")[1];

    const user = await authenticate(token); // JWT 인증
    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { id, name, category, isPrivate, password, participantLimit, lifespan } = await request.json();
    if (!id || !name || !category) {
        return new Response(JSON.stringify({ error: "Room ID, name, and category are required" }), { status: 400 });
    }

    try {
        // Check if room ID already exists
        const existingRoom = await prisma.room.findUnique({ where: { id } });
        if (existingRoom) {
            return new Response(JSON.stringify({ error: "Room ID already exists" }), { status: 400 });
        }

        const newRoom = await prisma.room.create({
            data: {
                id,
                name,
                category,
                isPrivate,
                password: isPrivate ? password : null,
                participantLimit: participantLimit ? parseInt(participantLimit) : null,
                lifespan: lifespan ? parseInt(lifespan) : null,
                createdBy: user.userId, // Fix here
            },
        });

        console.log("방 생성 완료. roomChanged 이벤트 발생.");
        // 방 생성 후 이벤트 발행
        eventEmitter.emit('roomChanged');

        return new Response(JSON.stringify({ room: newRoom }), { status: 201 });
    } catch (error) {
        console.error("Error creating room:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
