// src/app/dashboard/page.js

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import styles from './dashboard.module.css'; // CSS 모듈 임포트
import Navbar from "@/components/Navbar"; // 상단 메뉴 컴포넌트 임포트

export default function Dashboard() {
    const [userRooms, setUserRooms] = useState([]);
    const [allRooms, setAllRooms] = useState([]);
    const [roomName, setRoomName] = useState(""); // 방 이름
    const [roomId, setRoomId] = useState("");
    const [category, setCategory] = useState("General");
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState("");
    const [participantLimit, setParticipantLimit] = useState("");
    const [lifespan, setLifespan] = useState("");
    const [lifespanChecked, setLifespanChecked] = useState(false);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const storedNickname = localStorage.getItem("nickname"); // 닉네임 가져오기

        if (!token) {
            router.push("/login");
            return;
        }

        // Socket.io 초기화
        const SOCKET_SERVER_URL = window.location.origin;
        const newSocket = io(SOCKET_SERVER_URL, {
            path: "/socket.io",
            query: { token },
            transports: ["websocket"],
        });

        setSocket(newSocket);

        // 소켓 연결 이벤트
        newSocket.on("connect", () => {
            console.log("Connected to socket server");
            // 모든 방 목록 요청
            newSocket.emit("getAllRooms");
        });

        // 모든 방 목록 수신
        const handleAllRooms = (rooms) => {
            setAllRooms(rooms);
        };

        // 검색 결과 수신
        const handleSearchResults = (rooms) => {
            setAllRooms(rooms);
        };

        // 에러 메시지 수신
        const handleError = ({ message }) => {
            setError(message);
        };

        newSocket.on("allRooms", handleAllRooms);
        newSocket.on("searchResults", handleSearchResults);
        newSocket.on("error", handleError);

        return () => {
            newSocket.off("allRooms", handleAllRooms);
            newSocket.off("searchResults", handleSearchResults);
            newSocket.off("error", handleError);
            newSocket.disconnect();
        };
    }, [router]);

    const fetchRooms = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/auth-room/list", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            const data = await res.json();

            if (res.ok) {
                setUserRooms(data.userRooms);
                setAllRooms(data.allRooms);
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error("Error fetching rooms:", err);
            setError("방 목록을 가져오는 중 오류가 발생했습니다.");
        }
    };

    const handleCreateRoom = async () => {
        if (!roomName || !roomId || !category) {
            setError("방 이름, 방 ID, 카테고리는 필수 입력 사항입니다.");
            return;
        }

        const roomData = {
            name: roomName,
            id: roomId, // Assuming 'id' is the correct field
            category,
            isPrivate,
            password: isPrivate ? password : null,
            participantLimit: participantLimit ? parseInt(participantLimit) : null,
            lifespan: lifespanChecked ? parseInt(lifespan) : null,
        };

        try {
            const res = await fetch("/api/auth-room/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify(roomData),
            });

            const data = await res.json();

            if (res.ok) {
                alert("방이 성공적으로 생성되었습니다!");
                setRoomName("");
                setRoomId("");
                setCategory("General");
                setIsPrivate(false);
                setPassword("");
                setParticipantLimit("");
                setLifespan("");
                setLifespanChecked(false);
                fetchRooms();
                // 생성된 방으로 새 창 열기
                openChatWindow(data.room.id, isPrivate);
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error("Error creating room:", err);
            setError("방 생성 중 오류가 발생했습니다.");
        }
    };

    const handleDeleteRoom = async (roomIdToDelete) => {
        if (!confirm("정말로 이 방을 삭제하시겠습니까? 모든 메시지가 삭제됩니다.")) return;

        try {
            const res = await fetch("/api/auth-room/delete", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ roomId: roomIdToDelete }),
            });

            const data = await res.json();

            if (res.ok) {
                alert("방이 성공적으로 삭제되었습니다!");
                fetchRooms();
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error("Error deleting room:", err);
            setError("방 삭제 중 오류가 발생했습니다.");
        }
    };

    const handleJoinRoom = (room) => {
        // 비밀방 여부와 관계없이 방에 입장
        openChatWindow(room.id, room.isPrivate);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const query = searchQuery.trim();
        if (!query) {
            // 빈 검색어일 경우 모든 방 다시 불러오기
            socket.emit("getAllRooms");
            return;
        }

        // 소켓을 통해 방 검색 요청
        socket.emit("searchRooms", { query });
    };

    const openChatWindow = (roomId, isPrivate) => {
        const url = `${window.location.origin}/chat?roomId=${encodeURIComponent(roomId)}&isPrivate=${isPrivate}`;
        const windowFeatures = "width=500,height=600,left=200,top=100,resizable=yes,scrollbars=yes,status=yes";
        window.open(url, `ChatRoom_${roomId}`, windowFeatures);
    };

    useEffect(() => {
        // 초기 방 목록 로드
        fetchRooms();
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-custom-bg">
            <Navbar /> {/* 상단 메뉴 컴포넌트 추가 */}
            <div className="flex-grow p-6 bg-custom-bg">
                <h1 className="text-3xl font-bold mb-6 text-white text-center">Dashboard</h1>
                {error && <p className="text-error-color mb-4 text-center">{error}</p>}

                <div className="flex justify-center space-x-6">
                    {/* 왼쪽: 새 방 생성 */}
                    <div className={`w-1/4 bg-custom-bg p-6 rounded border border-button-border ${styles.roomCreation}`}>
                        <h2 className="text-xl font-semibold mb-4 text-custom-text">새 방 생성</h2>
                        <input
                            type="text"
                            placeholder="방 이름"
                            className="border border-input-border p-2 rounded mb-4 w-full bg-input-bg text-white disabled:bg-gray-700 disabled:text-gray-400"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="방 ID"
                            className="border border-input-border p-2 rounded mb-4 w-full bg-input-bg text-white disabled:bg-gray-700 disabled:text-gray-400"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                        />
                        <select
                            className="border border-input-border p-2 rounded mb-4 w-full bg-input-bg text-white disabled:bg-gray-700 disabled:text-gray-400"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="General">일반</option>
                            <option value="Technology">기술</option>
                            <option value="Random">랜덤</option>
                            {/* 추가적인 카테고리를 원하시면 여기에 추가하세요 */}
                        </select>
                        <input
                            type="number"
                            placeholder="참여자 수 제한 (선택 사항)"
                            className="border border-input-border p-2 rounded mb-4 w-full bg-input-bg text-white disabled:bg-gray-700 disabled:text-gray-400"
                            value={participantLimit}
                            onChange={(e) => setParticipantLimit(e.target.value)}
                        />

                        {/* 방 수명 설정 체크박스 */}
                        <div className="flex items-center mb-4">
                            <input
                                type="checkbox"
                                id="lifespan"
                                checked={lifespanChecked}
                                onChange={(e) => setLifespanChecked(e.target.checked)}
                                className="mr-2"
                            />
                            <label htmlFor="lifespan" className="text-custom-text">방 수명 설정 (분)</label>
                        </div>
                        {/* 방 수명 설정 입력 필드 */}
                        <input
                            type="number"
                            placeholder="수명 기간 (10분 단위)"
                            className="border border-input-border p-2 rounded mb-4 w-full bg-input-bg text-white disabled:bg-gray-900 disabled:text-gray-400"
                            value={lifespan}
                            onChange={(e) => setLifespan(e.target.value)}
                            step="10"
                            min="10"
                            disabled={!lifespanChecked}
                        />

                        {/* 비밀방 체크박스 */}
                        <div className="flex items-center mb-4">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="mr-2"
                            />
                            <label htmlFor="isPrivate" className="text-custom-text">비밀방</label>
                        </div>
                        {/* 비밀방 비밀번호 입력 필드 */}
                        <input
                            type="password"
                            placeholder="비밀방 비밀번호"
                            className="border border-input-border p-2 rounded mb-4 w-full bg-input-bg text-white disabled:bg-gray-900 disabled:text-gray-400"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={!isPrivate}
                        />

                        <button
                            className="px-4 py-2 bg-button-bg border border-button-border text-white rounded w-full transition duration-200 ease-in-out hover:brightness-200"
                            onClick={handleCreateRoom}
                        >
                            방 생성
                        </button>
                    </div>

                    {/* 중간: 내가 생성한 방들 */}
                    <div className={`w-1/4 bg-custom-bg p-6 rounded border border-button-border ${styles.userRooms}`}>
                        <h2 className="text-xl font-semibold mb-4 text-custom-text">내가 생성한 방들</h2>
                        {userRooms.length === 0 ? (
                            <p className="text-custom-text">생성한 방이 없습니다.</p>
                        ) : (
                            <ul>
                                {userRooms.map((room) => (
                                    <li key={room.id} className={`flex justify-between items-center mb-2 ${styles.roomItem_middle}`}>
                                        <span className="text-custom-text">{room.name} ({room.id})</span>
                                        <button
                                            className={`px-2 py-1 bg-button-bg border border-button-border text-white rounded transition duration-200 ease-in-out hover:brightness-200 ${styles.deleteButton}`}
                                            onClick={() => handleDeleteRoom(room.id)}
                                        >
                                            삭제
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* 오른쪽: 방 검색 및 모든 방들 */}
                    <div className={`w-1/4 bg-custom-bg p-6 rounded border border-button-border ${styles.rightSection}`}>
                        {/* 오른쪽 위 섹션: 방 검색 */}
                        <div className={`mb-6 ${styles.rightTopSection}`}>
                            <h2 className="text-xl font-semibold mb-4 text-custom-text">방 검색</h2>
                            <form onSubmit={handleSearch} className="flex mb-4">
                                <input
                                    type="text"
                                    placeholder="검색"
                                    className="border border-input-border p-2 rounded-l w-2/3 bg-input-bg text-white disabled:bg-gray-700 disabled:text-gray-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-button-bg border border-button-border text-white rounded-r transition duration-200 ease-in-out hover:brightness-200 w-1/3"
                                >
                                    검색
                                </button>
                            </form>
                            {searchQuery && allRooms.length === 0 && (
                                <div className="flex justify-center items-center h-24">
                                    <p className="text-custom-text">검색 결과가 없습니다.</p>
                                </div>
                            )}
                        </div>

                        {/* 오른쪽 아래 섹션: 모든 방들 */}
                        <div className={`bg-custom-bg p-6 rounded border border-button-border ${styles.rightBottomSection}`}>
                            <h2 className="text-xl font-semibold mb-4 text-custom-text">모든 방들</h2>
                            {allRooms.length === 0 ? (
                                <p className="text-custom-text">현재 활성화된 방이 없습니다.</p>
                            ) : (
                                <ul>
                                    {allRooms.map((room) => (
                                        <li key={room.id} className={`flex justify-between items-center mb-2 ${styles.roomItem_right
                                            }`}>
                                            <div className="flex-1 mr-4 text-custom-text truncate">
                                                <span className="font-semibold">{room.name}</span> ({room.id}) - {room.category}
                                                {room.isPrivate && " 🔒"}
                                                {room.creatorNickname && ` - 생성자: ${room.creatorNickname}`}
                                            </div>
                                            <button
                                                className={`px-2 py-1 bg-button-bg border border-button-border text-white rounded transition duration-200 ease-in-out hover:brightness-200 ${styles.joinButton}`}
                                                onClick={() => handleJoinRoom(room)}
                                            >
                                                입장
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
