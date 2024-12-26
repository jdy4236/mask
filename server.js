// server.js

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // 환경 변수 로드

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// JWT 인증 함수
function authenticateSocket(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.userId;
    } catch (error) {
        console.error("Socket authentication failed:", error);
        return null;
    }
}

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

    // 소켓 인증 미들웨어
    io.use((socket, next) => {
        const token = socket.handshake.query.token;
        if (token) {
            const userId = authenticateSocket(token);
            if (userId) {
                socket.userId = userId;
                return next();
            }
        }
        console.log("Unauthorized socket connection attempt");
        return next(new Error("Unauthorized"));
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id, 'UserID:', socket.userId);

        // 방 참가
        socket.on('joinRoom', ({ roomId, nickname }) => {
            socket.join(roomId);
            socket.nickname = nickname;

            // 현재 방의 사용자 목록 업데이트
            const users = Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
                (id) => {
                    const s = io.sockets.sockets.get(id);
                    return { id: s.id, nickname: s.nickname };
                }
            );
            io.to(roomId).emit('roomUsers', users);
        });

        // 메시지 전송
        socket.on('message', ({ roomId, message, nickname, timestamp }) => {
            console.log(`Message from ${nickname} (UserID: ${socket.userId}) in room ${roomId}: ${message}`);

            // 메시지 암호화 및 데이터베이스 저장 로직 추가 (필요 시)
            // 예시:
            /*
            const encryptedMessage = encryptMessage(message);
            prisma.message.create({
                data: {
                    roomId,
                    senderId: socket.userId,
                    content: encryptedMessage,
                },
            }).catch(error => console.error("Error saving message:", error));
            */

            // 메시지 전송
            io.to(roomId).emit('message', { nickname, message, timestamp });
        });

        socket.on('disconnect', (reason) => {
            console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
            // 필요 시 사용자 목록 업데이트 로직 추가
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
