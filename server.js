// server.js

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import dotenv from 'dotenv';
import prisma from './src/lib/prisma.js'; // ESM에서는 파일 확장자 명시 필요
import bcrypt from 'bcrypt';
import { authenticate } from './src/lib/auth.js'; // ESM에서는 파일 확장자 명시 필요
import jwt from 'jsonwebtoken';

dotenv.config(); // 환경 변수 로드

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = express();
    const httpServer = createServer(server);
    const io = new Server(httpServer, {
        path: '/socket.io',
        cors: {
            origin: "*", // 개발 시 모든 출처 허용. 배포 시 실제 도메인으로 변경 권장
            methods: ["GET", "POST"],
        },
    });

    // Socket.io 인증 미들웨어
    io.use(async (socket, nextMiddleware) => {
        const token = socket.handshake.query.token;
        const user = await authenticate(token);
        if (user) {
            socket.userId = user.userId;
            socket.nickname = user.nickname;
            return nextMiddleware();
        }
        console.log("Unauthorized socket connection attempt");
        return nextMiddleware(new Error("Unauthorized"));
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id, 'UserID:', socket.userId, 'Nickname:', socket.nickname);

        // 방 참가 이벤트
        socket.on('joinRoom', async ({ roomId, password }) => {
            try {
                const room = await prisma.room.findUnique({
                    where: { id: roomId },
                });

                if (!room) {
                    socket.emit('error', { message: '방을 찾을 수 없습니다.' });
                    return;
                }

                if (room.isPrivate) {
                    if (!password) {
                        socket.emit('error', { message: '비밀방 비밀번호가 필요합니다.' });
                        return;
                    }
                    const isPasswordValid = await bcrypt.compare(password, room.password);
                    if (!isPasswordValid) {
                        socket.emit('error', { message: '비밀번호가 틀렸습니다.' });
                        return;
                    }
                }

                // 방에 참가
                socket.join(roomId);

                // 현재 방의 사용자 목록 업데이트
                const socketsInRoom = await io.in(roomId).fetchSockets();
                const usersInRoom = socketsInRoom.map(s => ({
                    id: s.id,
                    nickname: s.nickname,
                }));

                io.to(roomId).emit('roomUsers', usersInRoom);

                // 이전 메시지 불러오기
                const previousMessages = await prisma.message.findMany({
                    where: { roomId: roomId },
                    include: { User: { select: { nickname: true } } },
                    orderBy: { createdAt: 'asc' },
                });

                const formattedMessages = previousMessages.map(msg => ({
                    nickname: msg.User.nickname,
                    message: msg.content, // 필요 시 복호화 적용
                    timestamp: msg.createdAt.toLocaleTimeString(),
                }));

                // 클라이언트에 이전 메시지 전송
                socket.emit('previousMessages', formattedMessages);

                // 시스템 메시지: 사용자 입장
                io.to(roomId).emit('message', { nickname: '시스템', message: `${socket.nickname} 님이 입장했습니다.`, timestamp: new Date().toLocaleTimeString() });
            } catch (error) {
                console.error("Error joining room:", error);
                socket.emit('error', { message: '방 참가 중 오류가 발생했습니다.' });
            }
        });

        // 메시지 전송 이벤트
        socket.on('message', async ({ roomId, message }) => {
            console.log(`Message from ${socket.nickname} (UserID: ${socket.userId}) in room ${roomId}: ${message}`);

            try {
                // 메시지 저장
                const newMessage = await prisma.message.create({
                    data: {
                        roomId,
                        senderId: socket.userId,
                        content: message, // 필요 시 암호화 적용
                        // createdAt은 Prisma에서 자동 설정
                    },
                });

                // 메시지 전송
                io.to(roomId).emit('message', { nickname: socket.nickname, message: newMessage.content, timestamp: newMessage.createdAt.toLocaleTimeString() });
            } catch (error) {
                console.error("Error saving or emitting message:", error);
                socket.emit('error', { message: '메시지 전송 중 오류가 발생했습니다.' });
            }
        });

        // 방 검색 이벤트
        socket.on('searchRooms', async ({ query }) => {
            try {
                const rooms = await prisma.room.findMany({
                    where: {
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { category: { contains: query, mode: 'insensitive' } },
                        ],
                    },
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        isPrivate: true,
                        participantLimit: true,
                        createdAt: true,
                    },
                });

                socket.emit('searchResults', rooms);
            } catch (error) {
                console.error("Error searching rooms:", error);
                socket.emit('error', { message: '방 검색 중 오류가 발생했습니다.' });
            }
        });

        // 모든 방 목록 요청 이벤트
        socket.on('getAllRooms', async () => {
            try {
                const rooms = await prisma.room.findMany({
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        isPrivate: true,
                        participantLimit: true,
                        createdAt: true,
                    },
                });

                socket.emit('allRooms', rooms);
            } catch (error) {
                console.error("Error fetching all rooms:", error);
                socket.emit('error', { message: '방 목록을 가져오는 중 오류가 발생했습니다.' });
            }
        });

        // 비밀방 비밀번호 검증 이벤트
        socket.on('verifyRoomPassword', async ({ roomId, password }) => {
            try {
                const room = await prisma.room.findUnique({
                    where: { id: roomId },
                });

                if (!room) {
                    socket.emit('passwordVerification', { success: false, message: '방을 찾을 수 없습니다.' });
                    return;
                }

                if (!room.isPrivate) {
                    socket.emit('passwordVerification', { success: true, message: '비밀방이 아닙니다.' });
                    return;
                }

                if (!password) {
                    socket.emit('passwordVerification', { success: false, message: '비밀번호가 필요합니다.' });
                    return;
                }

                const isPasswordValid = await bcrypt.compare(password, room.password);

                if (isPasswordValid) {
                    socket.emit('passwordVerification', { success: true, message: '비밀번호가 일치합니다.' });
                    socket.join(roomId);
                    // 사용자 목록 업데이트
                    const socketsInRoom = await io.in(roomId).fetchSockets();
                    const usersInRoom = socketsInRoom.map(s => ({
                        id: s.id,
                        nickname: s.nickname,
                    }));
                    io.to(roomId).emit('roomUsers', usersInRoom);
                    // 시스템 메시지
                    io.to(roomId).emit('message', { nickname: '시스템', message: `${socket.nickname} 님이 입장했습니다.`, timestamp: new Date().toLocaleTimeString() });
                } else {
                    socket.emit('passwordVerification', { success: false, message: '비밀번호가 틀렸습니다.' });
                }
            } catch (error) {
                console.error("Error verifying room password:", error);
                socket.emit('passwordVerification', { success: false, message: '비밀번호 확인 중 오류가 발생했습니다.' });
            }
        });

        socket.on('disconnect', async (reason) => {
            console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
            // 사용자 목록 업데이트 로직
            const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
            for (const roomId of rooms) {
                const socketsInRoom = await io.in(roomId).fetchSockets();
                const usersInRoom = socketsInRoom.map(s => ({
                    id: s.id,
                    nickname: s.nickname,
                }));
                io.to(roomId).emit('roomUsers', usersInRoom);
                io.to(roomId).emit('message', { nickname: '시스템', message: `${socket.nickname} 님이 퇴장했습니다.`, timestamp: new Date().toLocaleTimeString() });
            }
        });
    });

    // Next.js 페이지 라우팅
    server.all('*', (req, res) => {
        return handle(req, res);
    });

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
        console.log(`> Ready on http://localhost:${PORT}`);
    });
});