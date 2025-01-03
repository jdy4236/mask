// src/app/api/admin/users/[id]/route.js

import { verifyAdmin } from '@/lib/adminAuth.js';
import prisma from '@/lib/prisma.js';

export async function DELETE(request, { params }) {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader && authHeader.split(" ")[1];
    const admin = await verifyAdmin(token);

    if (!admin) {
        return new Response(JSON.stringify({ error: "인증되지 않은 사용자입니다." }), { status: 401 });
    }

    const { id } = params;

    try {
        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });

        if (!user || user.role !== 'admin') {
            return new Response(JSON.stringify({ error: "관리자 사용자를 찾을 수 없습니다." }), { status: 404 });
        }

        await prisma.user.delete({ where: { id: parseInt(id) } });

        return new Response(JSON.stringify({ message: "관리자 사용자가 성공적으로 삭제되었습니다." }), { status: 200 });
    } catch (error) {
        console.error("관리자 사용자 삭제 오류:", error);
        return new Response(JSON.stringify({ error: "내부 서버 오류." }), { status: 500 });
    }
}
