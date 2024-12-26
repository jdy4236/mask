// src/app/chat/page.js

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import styles from './chat.module.css'; // CSS 모듈 임포트
import Navbar from "@/components/Navbar"; // 상단 메뉴 컴포넌트 임포트

let socket;

export default function ChatPage() {
    const [roomId, setRoomId] = useState(null);
    const [nickname, setNickname] = useState(null);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [password, setPassword] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const messagesEndRef = useRef(null);
    const router = useRouter();
    const [error, setError] = useState("");

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const room = searchParams.get("roomId");
        const isPrivateRoom = searchParams.get("isPrivate") === "true";

        if (!room) {
            router.push("/dashboard"); // 잘못된 접근 시 대시보드로 리디렉션
            return;
        }

        setRoomId(room);
        setIsPrivate(isPrivateRoom);

        // JWT 토큰과 닉네임 가져오기
        const token = localStorage.getItem("token");
        const storedNickname = localStorage.getItem("nickname");

        if (!token || !storedNickname) {
            alert("인증 토큰이 없습니다. 다시 로그인해주세요.");
            router.push("/login");
            return;
        }

        setNickname(storedNickname);

        // Socket.io 서버 초기화 (현재 도메인 사용)
        const SOCKET_SERVER_URL = window.location.origin;

        socket = io(SOCKET_SERVER_URL, {
            path: "/socket.io",
            query: {
                token: token, // JWT 토큰 전달
            },
            transports: ["websocket"], // WebSocket만 사용
        });

        // 방 참가 시 비밀방일 경우 비밀번호 요청
        if (isPrivateRoom) {
            setShowPasswordPrompt(true);
        } else {
            socket.emit("joinRoom", { roomId: room, password: null });
        }

        // 닉네임 중복 에러 처리
        socket.on("nicknameError", ({ message }) => {
            alert(message);
            window.close(); // 창을 닫습니다.
        });

        // 사용자 목록 업데이트
        socket.on("roomUsers", (users) => {
            console.log("Received users:", users); // 디버깅용 로그
            setUsers(users);
        });

        // 이전 메시지 수신 처리
        socket.on("previousMessages", (messages) => {
            setMessages(messages);
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });

        // 메시지 수신 처리
        socket.on("message", ({ nickname, message, timestamp }) => {
            setMessages((prev) => [...prev, { nickname, message, timestamp }]);
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });

        // 비밀번호 확인 결과 수신
        socket.on("passwordVerification", ({ success, message }) => {
            if (success) {
                setShowPasswordPrompt(false);
                socket.emit("joinRoom", { roomId: room, password: password });
            } else {
                alert(message);
                window.close(); // 창을 닫습니다.
            }
        });

        // 방 참가 중 에러 처리
        socket.on("error", ({ message }) => {
            alert(message);
            window.close(); // 창을 닫습니다.
        });

        // 소켓 연결 에러 처리
        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
            alert("채팅 서버에 연결할 수 없습니다. 다시 시도해 주세요.");
            window.close(); // 창을 닫습니다.
        });

        // 소켓 연결 성공 시 로그
        socket.on("connect", () => {
            console.log("Connected to socket server");
        });

        return () => {
            socket.disconnect();
        };
    }, [router]);

    const sendMessage = () => {
        if (message.trim() && roomId) {
            socket.emit("message", { roomId, message }); // nickname과 timestamp 제거
            setMessage("");
        }
    };

    const generateInvite = async () => {
        const inviteLink = `${window.location.origin}/chat?roomId=${encodeURIComponent(roomId)}&isPrivate=${isPrivate}`;
        await navigator.clipboard.writeText(inviteLink);
        alert("초대 링크가 클립보드에 복사되었습니다!");
    };

    const handlePasswordSubmit = () => {
        if (!password.trim()) {
            alert("비밀번호를 입력해주세요.");
            return;
        }
        socket.emit("verifyRoomPassword", { roomId, password });
    };

    return (
        <div className={styles.container}>
            <div className={styles.chatContainer}>


                <div className="flex flex-col flex-grow">
                    <header className="bg-input-background p-4 flex justify-between items-center">
                        <h1 className="text-lg font-bold text-primary">채팅 방: {roomId}</h1>
                        <button
                            onClick={generateInvite}
                            className="bg-secondary text-primary px-4 py-2 rounded shadow-neon hover:bg-accent"
                        >
                            초대 링크 생성
                        </button>
                    </header>
                    <main className={styles.chatBox}>
                        <ul>
                            {messages.map((msg, index) => (
                                <li
                                    key={index}
                                    className={`${styles.message} ${msg.nickname === nickname ? styles.ownMessage : ""}`}
                                >
                                    <strong className={styles.nickname}>{msg.nickname}</strong>{" "}
                                    <span className={styles.timestamp}>({msg.timestamp})</span>:{" "}
                                    {msg.message}
                                </li>
                            ))}
                        </ul>
                        <div ref={messagesEndRef} />
                    </main>
                    <footer className={styles.footer}>
                        <div className={styles.inputContainer}>
                            <input
                                type="text"
                                className={styles.input}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="메시지를 입력하세요..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") sendMessage();
                                }}
                            />
                            <button
                                className={styles.button}
                                onClick={sendMessage}
                            >
                                전송
                            </button>
                        </div>
                    </footer>
                </div>

                {/* 비밀방 비밀번호 입력 모달 */}
                {showPasswordPrompt && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-input-background p-6 rounded shadow-md w-80">
                            <h2 className="text-xl font-bold mb-4 text-primary">비밀방 비밀번호 입력</h2>
                            <input
                                type="password"
                                placeholder="비밀번호"
                                className="border p-2 rounded mb-4 w-full bg-background text-foreground"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                className="px-4 py-2 bg-secondary text-primary rounded w-full hover:bg-accent"
                                onClick={handlePasswordSubmit}
                            >
                                입장
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
