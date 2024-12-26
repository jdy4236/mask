// src/app/api/auth-room/delete/route.js

import prisma from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function DELETE(req) {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader && authHeader.split(" ")[1];

    const userId = authenticate(token); // JWT 인증
    if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { roomId } = await req.json();
    if (!roomId) {
        return new Response(JSON.stringify({ error: "Room ID is required" }), { status: 400 });
    }

    try {
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room || room.createdBy !== userId) {
            return new Response(JSON.stringify({ error: "Not authorized to delete this room" }), { status: 403 });
        }

        // 방의 모든 메시지 삭제
        await prisma.message.deleteMany({ where: { roomId } });

        // 방 삭제
        await prisma.room.delete({ where: { id: roomId } });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error("Error deleting room:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
