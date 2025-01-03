// server.js

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import dotenv from 'dotenv';
import prisma from './src/lib/prisma.js';
import { authenticate } from './src/lib/auth.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import os from 'os';
import eventEmitter from './src/lib/eventEmitter.js'; // 이벤트 익스포터 임포트

dotenv.config(); // 환경 변수 로드

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// In-memory store to track last chat activity per room
const roomActivity = {};

// In-memory store to track real-time active users
let activeUsers = 0;

// In-memory store to track server resource usage
const serverResourceUsage = {
    cpuLoad: [],
    memoryUsage: [],
};

// Function to periodically update server resource usage
setInterval(() => {
    const loadAverage = os.loadavg();
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // in MB

    serverResourceUsage.cpuLoad.push({
        timestamp: new Date(),
        load1: loadAverage[0],
        load5: loadAverage[1],
        load15: loadAverage[2],
    });

    serverResourceUsage.memoryUsage.push({
        timestamp: new Date(),
        memory: memoryUsage,
    });

    // Keep only the latest 60 entries (e.g., last hour if interval is 1 minute)
    if (serverResourceUsage.cpuLoad.length > 60) {
        serverResourceUsage.cpuLoad.shift();
    }
    if (serverResourceUsage.memoryUsage.length > 60) {
        serverResourceUsage.memoryUsage.shift();
    }
}, 60000); // Update every 1 minute

app.prepare().then(async () => {
    // 기본 관리자 계정 시딩
    const adminEmail = 'maskadmin@example.com';
    const adminNickname = 'maskadmin';
    const adminPassword = 'a1234567890!';

    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await prisma.user.create({
            data: {
                nickname: adminNickname,
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
            },
        });
        console.log('기본 관리자 계정이 생성되었습니다.');
    } else {
        console.log('관리자 계정이 이미 존재합니다.');
    }

    const server = express();
    const httpServer = createServer(server);
    const io = new Server(httpServer, {
        path: "/socket.io",
        cors: {
            origin: "*", // 개발 시 모든 출처 허용. 배포 시 실제 도메인으로 변경 권장
            methods: ["GET", "POST"],
        },
    });

    // Socket.io 인증 미들웨어
    io.use(async (socket, nextMiddleware) => {
        const token = socket.handshake.query.token;
        const user = await authenticate(token);
        console.log("Authenticated user:", user); // 인증된 사용자 로그

        if (user) {
            socket.userId = user.userId; // 'userId'로 수정
            socket.nickname = user.nickname;
            socket.role = user.role; // 역할 정보 설정
            activeUsers += 1; // 활성 사용자 수 증가
            return nextMiddleware();
        }
        console.log("비인증된 소켓 연결 시도");
        return nextMiddleware(new Error("Unauthorized"));
    });

    io.on('connection', (socket) => {
        console.log('사용자 연결됨:', socket.id, 'UserID:', socket.userId, 'Nickname:', socket.nickname, 'Role:', socket.role);

        if (socket.role === 'admin') {
            // 관리자 전용 이벤트 핸들러

            // 총 통계 요청 이벤트
            socket.on('adminGetTotalStats', async () => {
                try {
                    const totalRooms = await prisma.room.count();
                    const totalUsers = await prisma.user.count();

                    console.log("Sending adminTotalStats to admin:", { totalRooms, totalUsers });
                    socket.emit('adminTotalStats', { totalRooms, totalUsers, activeUsers });
                } catch (error) {
                    console.error("총 통계 가져오기 오류:", error);
                    socket.emit('error', { message: '총 통계 가져오기 중 오류가 발생했습니다.' });
                }
            });

            // 방 세부 정보 요청 이벤트
            socket.on('adminGetRoomDetails', async () => {
                try {
                    const rooms = await prisma.room.findMany({
                        select: { id: true, name: true },
                    });

                    const roomDetails = await Promise.all(rooms.map(async (room) => {
                        const userCount = await io.in(room.id).allSockets().then(sockets => sockets.size);
                        const lastChat = roomActivity[room.id] || null;
                        const isActive = lastChat ? (Date.now() - lastChat) <= 60000 : false; // 최근 1분 이내 채팅 여부

                        return {
                            roomId: room.id,
                            roomName: room.name,
                            userCount,
                            isActive,
                        };
                    }));

                    console.log("Sending adminRoomDetails to admin:", roomDetails);
                    socket.emit('adminRoomDetails', roomDetails);
                } catch (error) {
                    console.error("방 세부 정보 가져오기 오류:", error);
                    socket.emit('error', { message: '방 세부 정보 가져오기 중 오류가 발생했습니다.' });
                }
            });

            // 사용자 통계 요청 이벤트 (통계 그래프용)
            socket.on('adminGetUserStats', async () => {
                try {
                    const now = new Date();
                    const stats = [];

                    for (let i = 0; i < 24; i++) {
                        const start = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
                        const end = new Date(now.getTime() - i * 60 * 60 * 1000);

                        const count = await prisma.user.count({
                            where: {
                                createdAt: {
                                    gte: start,
                                    lt: end,
                                },
                            },
                        });

                        stats.push({ hour: `${start.getHours()}시`, count });
                    }

                    console.log("Sending adminUserStats to admin:", stats);
                    socket.emit('adminUserStats', stats);
                } catch (error) {
                    console.error("사용 통계 가져오기 오류:", error);
                    socket.emit('error', { message: '사용 통계 가져오기 중 오류가 발생했습니다.' });
                }
            });

            // 시스템 상태 요청 이벤트
            socket.on('adminGetSystemStatus', async () => {
                try {
                    let dbStatus = 'Unknown';
                    try {
                        await prisma.$queryRaw`SELECT 1`;
                        dbStatus = 'Connected';
                    } catch {
                        dbStatus = 'Disconnected';
                    }

                    const loadAverage = os.loadavg();
                    const serverLoad = `1분: ${loadAverage[0].toFixed(2)}, 5분: ${loadAverage[1].toFixed(2)}, 15분: ${loadAverage[2].toFixed(2)}`;

                    console.log("Sending adminSystemStatus to admin:", { dbStatus, serverLoad });
                    socket.emit('adminSystemStatus', { dbStatus, serverLoad });
                } catch (error) {
                    console.error("시스템 상태 가져오기 오류:", error);
                    socket.emit('error', { message: '시스템 상태 가져오기 중 오류가 발생했습니다.' });
                }
            });

            // 관리자 사용자 목록 요청 이벤트
            socket.on('adminGetAdminUsers', async () => {
                try {
                    const admins = await prisma.user.findMany({
                        where: { role: 'admin' },
                        select: { id: true, email: true },
                    });
                    console.log("Sending adminAdminUsers to admin:", admins);
                    socket.emit('adminAdminUsers', admins);
                } catch (error) {
                    console.error("관리자 사용자 목록 가져오기 오류:", error);
                    socket.emit('error', { message: '관리자 사용자 목록 가져오기 중 오류가 발생했습니다.' });
                }
            });

            // 추가 통계 요청 이벤트 (예: 일별 메시지 수)
            socket.on('adminGetDailyMessageStats', async () => {
                try {
                    const now = new Date();
                    const stats = [];

                    for (let i = 0; i < 30; i++) { // 지난 30일
                        const start = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
                        const end = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

                        const count = await prisma.message.count({
                            where: {
                                createdAt: {
                                    gte: start,
                                    lt: end,
                                },
                            },
                        });

                        stats.push({ date: start.toISOString().split('T')[0], count });
                    }

                    console.log("Sending adminDailyMessageStats to admin:", stats);
                    socket.emit('adminDailyMessageStats', stats);
                } catch (error) {
                    console.error("일별 메시지 통계 가져오기 오류:", error);
                    socket.emit('error', { message: '일별 메시지 통계 가져오기 중 오류가 발생했습니다.' });
                }
            });

            // 실시간 활성 사용자 수 요청 이벤트
            socket.on('adminGetRealTimeActiveUsers', async () => {
                try {
                    // 이미 activeUsers 변수로 실시간 활성 사용자 수를 추적하고 있음
                    socket.emit('adminRealTimeActiveUsers', { activeUsers });
                } catch (error) {
                    console.error("실시간 활성 사용자 수 가져오기 오류:", error);
                    socket.emit('error', { message: '실시간 활성 사용자 수 가져오기 중 오류가 발생했습니다.' });
                }
            });

            // 서버 리소스 사용량 요청 이벤트
            socket.on('adminGetServerResourceUsage', async () => {
                try {
                    socket.emit('adminServerResourceUsage', serverResourceUsage);
                } catch (error) {
                    console.error("서버 리소스 사용량 가져오기 오류:", error);
                    socket.emit('error', { message: '서버 리소스 사용량 가져오기 중 오류가 발생했습니다.' });
                }
            });
        }

        // 일반 사용자 이벤트 핸들러

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
                    const isPasswordValid = password === room.password; // 비밀번호 직접 비교
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

                // 방 변경 사항 알림
                eventEmitter.emit('roomChanged');
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

                // 방의 최근 채팅 활동 시간 업데이트
                roomActivity[roomId] = Date.now();

                // 방 변경 사항 알림
                eventEmitter.emit('roomChanged');
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
            console.log("##### roomId : " + roomId);
            console.log("##### password : " + password);

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

                const isPasswordValid = password === room.password; // 비밀번호 직접 비교

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

                    // 방 변경 사항 알림
                    eventEmitter.emit('roomChanged');
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
            activeUsers -= 1; // 활성 사용자 수 감소

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

                // 방 변경 사항 알림
                eventEmitter.emit('roomChanged');
            }
        });
    });

    // 방 변경 이벤트를 admin에게 전달
    eventEmitter.on('roomChanged', async () => {
        console.log("roomChanged 이벤트 발생. 관리자에게 최신 데이터 전송.");

        try {
            // 최신 통계 가져오기
            const totalRooms = await prisma.room.count();
            const totalUsers = await prisma.user.count();

            const rooms = await prisma.room.findMany({
                select: { id: true, name: true },
            });

            const roomDetails = await Promise.all(rooms.map(async (room) => {
                const userCount = await io.in(room.id).allSockets().then(sockets => sockets.size);
                const lastChat = roomActivity[room.id] || null;
                const isActive = lastChat ? (Date.now() - lastChat) <= 60000 : false; // 최근 1분 이내 채팅 여부

                return {
                    roomId: room.id,
                    roomName: room.name,
                    userCount,
                    isActive,
                };
            }));

            // 사용자 통계 (통계 그래프용)
            const now = new Date();
            const stats = [];

            for (let i = 0; i < 24; i++) {
                const start = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
                const end = new Date(now.getTime() - i * 60 * 60 * 1000);

                const count = await prisma.user.count({
                    where: {
                        createdAt: {
                            gte: start,
                            lt: end,
                        },
                    },
                });

                stats.push({ hour: `${start.getHours()}시`, count });
            }

            // 일별 메시지 통계
            const dailyMessageStats = [];

            for (let i = 0; i < 30; i++) { // 지난 30일
                const start = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
                const end = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

                const count = await prisma.message.count({
                    where: {
                        createdAt: {
                            gte: start,
                            lt: end,
                        },
                    },
                });

                dailyMessageStats.push({ date: start.toISOString().split('T')[0], count });
            }

            // 시스템 상태 가져오기
            let dbStatus = 'Unknown';
            try {
                await prisma.$queryRaw`SELECT 1`;
                dbStatus = 'Connected';
            } catch {
                dbStatus = 'Disconnected';
            }

            const loadAverage = os.loadavg();
            const serverLoad = `1분: ${loadAverage[0].toFixed(2)}, 5분: ${loadAverage[1].toFixed(2)}, 15분: ${loadAverage[2].toFixed(2)}`;

            // 관리자 사용자 목록 가져오기
            const admins = await prisma.user.findMany({
                where: { role: 'admin' },
                select: { id: true, email: true },
            });

            // 서버 리소스 사용량 가져오기
            const currentResourceUsage = {
                cpuLoad: serverResourceUsage.cpuLoad,
                memoryUsage: serverResourceUsage.memoryUsage,
            };

            // 관리자에게 최신 데이터 전송
            io.sockets.sockets.forEach((userSocket) => { // Socket.io v4에서는 Map 형태로 소켓을 관리
                if (userSocket.role === 'admin') {
                    console.log(`Sending updated data to admin socket: ${userSocket.id}`);
                    userSocket.emit('adminTotalStats', { totalRooms, totalUsers, activeUsers });
                    userSocket.emit('adminRoomDetails', roomDetails);
                    userSocket.emit('adminUserStats', stats);
                    userSocket.emit('adminDailyMessageStats', dailyMessageStats);
                    userSocket.emit('adminSystemStatus', { dbStatus, serverLoad });
                    userSocket.emit('adminServerResourceUsage', currentResourceUsage);
                    userSocket.emit('adminAdminUsers', admins);
                }
            });
        } catch (error) {
            console.error("roomChanged 이벤트 처리 중 오류:", error);
        }
    });

    // Next.js 페이지 라우팅
    server.all('*', (req, res) => {
        return handle(req, res);
    });

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
        console.log(`> 서버가 http://localhost:${PORT}에서 실행 중입니다.`);
    });
});
