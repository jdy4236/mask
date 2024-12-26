// src/app/api/auth-room/create/route.js

import prisma from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function POST(req) {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader && authHeader.split(" ")[1];

    // JWT 인증
    const userId = authenticate(token);
    if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // 요청에서 방 정보 추출
    const { name, roomId, category, isPrivate, password, participantLimit, lifespan } = await req.json();
    if (!name || !roomId || !category) {
        return new Response(JSON.stringify({ error: "Name, Room ID, and Category are required" }), { status: 400 });
    }

    try {
        // 비밀방일 경우 비밀번호 필수
        if (isPrivate && !password) {
            return new Response(JSON.stringify({ error: "Password is required for private rooms" }), { status: 400 });
        }

        // 방 정보 데이터베이스에 저장
        const room = await prisma.room.create({
            data: {
                id: roomId,
                name,
                category,
                isPrivate,
                password: isPrivate ? password : null,
                participantLimit: participantLimit || null,
                lifespan: lifespan || null,
                createdBy: userId,
            },
        });

        // 성공 응답
        return new Response(JSON.stringify({ success: true, room }), { status: 201 });
    } catch (error) {
        console.error("Error creating room:", error);

        // 방 ID 중복 에러 처리
        if (error.code === 'P2002') {
            return new Response(JSON.stringify({ error: "Room ID already exists" }), { status: 409 });
        }

        // 기타 에러 처리
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
