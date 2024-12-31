// src/app/chat/page.js

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import styles from './chat.module.css'; // CSS 모듈 임포트

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
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const messagesEndRef = useRef(null);
    const router = useRouter();
    const [error, setError] = useState("");

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        let room = searchParams.get("roomId");
        let isPrivateRoom = searchParams.get("isPrivate") === "true";

        if (!room) {
            // sessionStorage에서 방 정보 복원 시도
            room = sessionStorage.getItem('currentRoomId');
            isPrivateRoom = sessionStorage.getItem('currentIsPrivate') === 'true';
        } else {
            // 새로운 방 정보가 있을 경우 sessionStorage에 저장
            sessionStorage.setItem('currentRoomId', room);
            sessionStorage.setItem('currentIsPrivate', isPrivateRoom);
        }

        if (!room) {
            router.push("/dashboard"); // 방 정보가 없을 경우 대시보드로 리디렉션
            return;
        }

        setRoomId(room);
        setIsPrivate(isPrivateRoom);

        // URL에서 쿼리 파라미터 제거
        router.replace("/chat");

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
                // 이미 방에 참가했으므로 추가적으로 joinRoom을 호출할 필요 없음
            } else {
                alert(message);
                // 비밀번호 재입력 요청
                setPassword("");
            }
        });

        // 방 참가 중 에러 처리
        socket.on("error", ({ message }) => {
            alert(message);
            // 비밀번호 재입력 요청
            setShowPasswordPrompt(true);
            setPassword("");
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
            // 창을 닫을 때 sessionStorage에서 방 정보 삭제
            sessionStorage.removeItem('currentRoomId');
            sessionStorage.removeItem('currentIsPrivate');
        };
    }, [router]);

    const sendMessage = () => {
        if (message.trim() && roomId) {
            socket.emit("message", { roomId, message });
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
        <div className="flex flex-col min-h-screen bg-custom-bg text-custom-text">
            {/* 글로벌 스크롤바 스타일 추가 */}
            <style jsx global>{`
                /* Webkit 기반 브라우저 (Chrome, Safari, Edge)용 스크롤바 스타일 */
                ::-webkit-scrollbar {
                    width: 8px;
                }

                ::-webkit-scrollbar-track {
                    background: #2c2f33;
                }

                ::-webkit-scrollbar-thumb {
                    background-color: #555;
                    border-radius: 4px;
                    border: 2px solid #2c2f33;
                }

                /* Firefox용 스크롤바 스타일 */
                * {
                    scrollbar-width: thin;
                    scrollbar-color: #555 #2c2f33;
                }
            `}</style>

            <div className={`flex-grow p-6 bg-custom-bg ${styles.container}`}>
                {error && <p className={`text-error-color mb-4 text-center ${styles.error}`}>{error}</p>}

                <div className={`flex flex-col bg-custom-bg border border-button-border rounded shadow-lg w-full max-w-md ${styles.chatContainer}`}>
                    <header className="bg-custom-bg text-white py-4 px-6 flex justify-between items-center rounded-t border-b border-button-border">
                        <div>
                            <h1 className="text-lg font-bold">채팅 방: {roomId}</h1>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                                    className="px-4 py-2 bg-button-bg border border-button-border text-white rounded"
                                >
                                    사용자 목록
                                </button>
                                {showUserDropdown && (
                                    <div className="absolute right-0 mt-2 w-48 bg-custom-bg border border-button-border rounded shadow-lg z-10">
                                        <ul className="py-2">
                                            {users.map((user, index) => (
                                                <li key={index} className="px-4 py-2 hover:bg-button-bg text-white">
                                                    {user.nickname ? user.nickname : user}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* <button
                                onClick={generateInvite}
                                className="px-4 py-2 bg-button-bg border border-button-border text-white rounded"
                            >
                                초대 링크 생성
                            </button> */}

                        </div>
                    </header>
                    <div className="flex flex-grow">
                        <main className={`flex-1 p-4 ${styles.chatBox}`}>
                            <ul>
                                {messages.map((msg, index) => (
                                    <li
                                        key={index}
                                        className={`${styles.message} ${msg.nickname === nickname ? styles.ownMessage : ""}`}
                                    >
                                        <strong className={styles.nickname}>{msg.nickname}</strong>{" "}
                                        <span className={styles.timestamp}>({msg.timestamp})</span>: {msg.message}
                                    </li>
                                ))}
                            </ul>
                            <div ref={messagesEndRef} />
                        </main>
                    </div>
                    <footer className="bg-custom-bg p-4 flex">
                        <div className={`${styles.inputContainer} flex-1`}>
                            <input
                                type="text"
                                className={`bg-input-bg border border-input-border text-white ${styles.input}`}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="메시지를 입력하세요..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") sendMessage();
                                }}
                            />
                            <button
                                className={`px-4 py-2 bg-button-bg border border-button-border text-white rounded ${styles.button}`}
                                onClick={sendMessage}
                            >
                                전송
                            </button>
                        </div>
                    </footer>

                    {/* 비밀방 비밀번호 입력 모달 */}
                    {showPasswordPrompt && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="bg-custom-bg border border-button-border p-6 rounded shadow-md w-80">
                                <h2 className="text-xl font-bold mb-4 text-white">비밀방 비밀번호 입력</h2>
                                <input
                                    type="password"
                                    placeholder="비밀번호"
                                    className="border border-input-border p-2 rounded mb-4 w-full bg-input-bg text-white"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    className="px-4 py-2 bg-button-bg border border-button-border text-white rounded w-full transition duration-200 ease-in-out hover:brightness-200"
                                    onClick={handlePasswordSubmit}
                                >
                                    입장
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
