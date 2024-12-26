// src/app/api/socket/route.js

import { Server } from "socket.io";
import { authenticateSocket } from '@/lib/authSocket.js';
import prisma from '@/lib/prisma.js';
import { encryptMessage, decryptMessage } from '@/lib/crypto.js';

export const config = {
    api: {
        bodyParser: false,
    },
};

let io;

const ioHandler = (req, res) => {
    if (!res.socket.server.io) {
        console.log("Initializing Socket.io");

        io = new Server(res.socket.server, {
            path: "/socket.io",
            addTrailingSlash: false,
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });

        // 소켓 인증 미들웨어 추가
        io.use(async (socket, next) => {
            const token = socket.handshake.query.token;
            if (token) {
                const userId = authenticateSocket(token);
                if (userId) {
                    socket.userId = userId;
                    return next();
                }
            }
            return next(new Error("Unauthorized"));
        });

        io.on("connection", (socket) => {
            console.log("A user connected:", socket.id, "UserID:", socket.userId);

            // 방 참가
            socket.on("joinRoom", ({ roomId, nickname }) => {
                socket.join(roomId);
                socket.nickname = nickname;

                // 현재 방의 사용자 목록 업데이트
                const users = Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
                    (id) => {
                        const s = io.sockets.sockets.get(id);
                        return { id: s.id, nickname: s.nickname };
                    }
                );
                io.to(roomId).emit("roomUsers", users);
            });

            // 메시지 전송
            socket.on("message", async ({ roomId, message, nickname, timestamp }) => {
                console.log(`Message from ${nickname} (UserID: ${socket.userId}) in room ${roomId}: ${message}`);

                // 메시지 암호화
                const encryptedMessage = encryptMessage(message);

                // 메시지 저장
                try {
                    await prisma.message.create({
                        data: {
                            roomId,
                            senderId: socket.userId,
                            content: encryptedMessage,
                        },
                    });
                } catch (error) {
                    console.error("Error saving message:", error);
                }

                // 메시지 복호화 후 전송
                const decryptedMessage = decryptMessage(encryptedMessage);
                io.to(roomId).emit("message", { nickname, message: decryptedMessage, timestamp });
            });

            socket.on("disconnect", () => {
                console.log("User disconnected:", socket.id);
            });
        });

        res.socket.server.io = io;
    } else {
        console.log("Socket.io already initialized");
    }
    res.end();
};

export default ioHandler;
