// src/app/api/auth-room/delete/route.js

import prisma from '@/lib/prisma.js';
import { authenticate } from '@/lib/auth.js';
import eventEmitter from '@/lib/eventEmitter.js'; // 이벤트 익스포터 임포트

export async function DELETE(request) {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader && authHeader.split(" ")[1];

    const user = await authenticate(token); // JWT 인증
    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { roomId } = await request.json();
    if (!roomId) {
        return new Response(JSON.stringify({ error: "Room ID is required" }), { status: 400 });
    }

    try {
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room || room.createdBy !== user.userId) {
            return new Response(JSON.stringify({ error: "Not authorized to delete this room" }), { status: 403 });
        }

        // 방의 모든 메시지 삭제
        await prisma.message.deleteMany({ where: { roomId } });

        // 방 삭제
        await prisma.room.delete({ where: { id: roomId } });

        console.log("방 삭제 완료. roomChanged 이벤트 발생.");
        // 방 삭제 후 이벤트 발행
        eventEmitter.emit('roomChanged');

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error("Error deleting room:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
