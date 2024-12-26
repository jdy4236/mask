// src/app/chat/page.js

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import styles from './chat.module.css'; // CSS 모듈 임포트

let socket;

export default function ChatPage() {
    const [roomId, setRoomId] = useState(null);
    const [nickname, setNickname] = useState(null);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const messagesEndRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const room = searchParams.get("roomId");
        const name = searchParams.get("nickname");

        if (!room || !name) {
            router.push("/");
            return;
        }

        setRoomId(room);
        setNickname(name);

        // JWT 토큰 가져오기
        const token = localStorage.getItem("token");

        // Socket.io 서버 초기화 (환경에 따라 URL 변경 필요)
        const SOCKET_SERVER_URL = window.location.origin; // 현재 도메인 사용

        socket = io(SOCKET_SERVER_URL, {
            path: "/socket.io",
            query: {
                token: token, // JWT 토큰 전달
            },
            transports: ["websocket"], // WebSocket만 사용
        });

        // 방 참가
        socket.emit("joinRoom", { roomId: room, nickname: name });

        // 닉네임 중복 에러 처리
        socket.on("nicknameError", ({ message }) => {
            alert(message);
            router.push(`/?invite=true&roomId=${room}`); // 초대장 URL 유지
        });

        // 사용자 목록 업데이트
        socket.on("roomUsers", (users) => {
            console.log("Received users:", users); // 디버깅용 로그
            setUsers(users);
        });

        // 메시지 수신 처리
        socket.on("message", ({ nickname, message, timestamp }) => {
            setMessages((prev) => [...prev, { nickname, message, timestamp }]);
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });

        // 소켓 연결 에러 처리
        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
            alert("채팅 서버에 연결할 수 없습니다. 다시 시도해 주세요.");
            router.push("/");
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
        if (message.trim() && roomId && nickname) {
            const timestamp = new Date().toLocaleTimeString();
            socket.emit("message", { roomId, message, nickname, timestamp });
            setMessage("");
        }
    };

    const generateInvite = async () => {
        const inviteLink = `${window.location.origin}/?invite=true&roomId=${roomId}`;
        await navigator.clipboard.writeText(inviteLink);
        alert("초대 링크가 클립보드에 복사되었습니다!");
    };

    return (
        <div className={`flex flex-col h-screen ${styles.container}`}>
            <header className="bg-blue-600 text-white py-4 px-6 flex justify-between">
                <div>
                    <h1 className="text-lg font-bold">채팅 방: {roomId}</h1>
                    <p>닉네임: {nickname}</p>
                </div>
                <button
                    onClick={generateInvite}
                    className="bg-white text-blue-600 px-4 py-2 rounded shadow"
                >
                    초대 링크 생성
                </button>
            </header>
            <div className="flex flex-grow">
                <main className={`flex-grow overflow-y-auto p-4 ${styles.chatBox}`}>
                    <ul>
                        {messages.map((msg, index) => (
                            <li
                                key={index}
                                className={`${styles.message} ${msg.nickname === nickname ? styles.ownMessage : ""
                                    }`}
                            >
                                <strong className={styles.nickname}>{msg.nickname}</strong>{" "}
                                <span className={styles.timestamp}>({msg.timestamp})</span>:{" "}
                                {msg.message}
                            </li>
                        ))}
                    </ul>
                    <div ref={messagesEndRef} />
                </main>
                <aside className={styles.userList}>
                    <h2 className={styles.userListTitle}>사용자 목록</h2>
                    <ul>
                        {users.map((user, index) => (
                            <li key={index} className={styles.userItem}>
                                {user.nickname ? user.nickname : user}
                            </li>
                        ))}
                    </ul>
                </aside>
            </div>
            <footer className="bg-white p-4 flex">
                <div className={styles.inputContainer}>
                    <input
                        type="text"
                        className={`${styles.input} text-black`}
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
    );
}
