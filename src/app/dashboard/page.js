// src/app/dashboard/page.js

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
    const [userRooms, setUserRooms] = useState([]);
    const [allRooms, setAllRooms] = useState([]);
    const [name, setName] = useState("");
    const [roomId, setRoomId] = useState("");
    const [category, setCategory] = useState("General");
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState("");
    const [participantLimit, setParticipantLimit] = useState("");
    const [lifespan, setLifespan] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        // 서버에 토큰 검증 요청 (클라이언트에서 JWT 검증을 제거했으므로 서버에 요청)
        fetch("/api/auth/verify-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.valid) {
                    fetchRooms();
                } else {
                    router.push("/login");
                }
            })
            .catch((err) => {
                console.error("Token verification failed:", err);
                router.push("/login");
            });
    }, [router]);

    const fetchRooms = async () => {
        try {
            const res = await fetch("/api/auth-room/list", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
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
        if (!name || !roomId || !category) {
            setError("방 이름, 방 ID, 카테고리는 필수 입력 사항입니다.");
            return;
        }

        const roomData = {
            name,
            roomId,
            category,
            isPrivate,
            password: isPrivate ? password : null,
            participantLimit: participantLimit ? parseInt(participantLimit) : null,
            lifespan: lifespan ? parseInt(lifespan) : null,
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
                fetchRooms();
                // 생성된 방으로 이동
                router.push(`/chat?roomId=${roomId}&nickname=${name}`);
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error("Error creating room:", err);
            setError("방 생성 중 오류가 발생했습니다.");
        }
    };

    const handleDeleteRoom = async (roomId) => {
        if (!confirm("정말로 이 방을 삭제하시겠습니까? 모든 메시지가 삭제됩니다.")) return;

        try {
            const res = await fetch("/api/auth-room/delete", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ roomId }),
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

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-center">Dashboard</h1>
            {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

            {/* 방 생성 섹션 */}
            <div className="max-w-md mx-auto bg-white p-6 rounded shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">새 방 생성</h2>
                <input
                    type="text"
                    placeholder="방 이름"
                    className="border p-2 rounded mb-4 w-full"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="방 ID"
                    className="border p-2 rounded mb-4 w-full"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                />
                <select
                    className="border p-2 rounded mb-4 w-full"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="General">일반</option>
                    <option value="Technology">기술</option>
                    <option value="Random">랜덤</option>
                    {/* 추가적인 카테고리를 원하시면 여기에 추가하세요 */}
                </select>
                <div className="flex items-center mb-4">
                    <input
                        type="checkbox"
                        id="isPrivate"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="mr-2"
                    />
                    <label htmlFor="isPrivate">비밀방</label>
                </div>
                {isPrivate && (
                    <input
                        type="password"
                        placeholder="비밀방 비밀번호"
                        className="border p-2 rounded mb-4 w-full"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                )}
                <input
                    type="number"
                    placeholder="참여자 수 제한 (선택 사항)"
                    className="border p-2 rounded mb-4 w-full"
                    value={participantLimit}
                    onChange={(e) => setParticipantLimit(e.target.value)}
                />
                <div className="flex items-center mb-4">
                    <input
                        type="checkbox"
                        id="lifespan"
                        checked={lifespan !== ""}
                        onChange={(e) => setLifespan(e.target.checked ? "10" : "")}
                        className="mr-2"
                    />
                    <label htmlFor="lifespan">방 수명 설정 (분)</label>
                </div>
                {lifespan !== "" && (
                    <input
                        type="number"
                        placeholder="수명 기간 (10분 단위)"
                        className="border p-2 rounded mb-4 w-full"
                        value={lifespan}
                        onChange={(e) => setLifespan(e.target.value)}
                        step="10"
                        min="10"
                    />
                )}
                <button
                    className="px-4 py-2 bg-blue-500 text-white rounded w-full"
                    onClick={handleCreateRoom}
                >
                    방 생성
                </button>
            </div>

            {/* 사용자가 생성한 방 목록 */}
            <div className="max-w-md mx-auto bg-white p-6 rounded shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">내가 생성한 방들</h2>
                {userRooms.length === 0 ? (
                    <p>생성한 방이 없습니다.</p>
                ) : (
                    <ul>
                        {userRooms.map((room) => (
                            <li key={room.id} className="flex justify-between items-center mb-2">
                                <span>{room.name} ({room.id})</span>
                                <button
                                    className="px-2 py-1 bg-red-500 text-white rounded"
                                    onClick={() => handleDeleteRoom(room.id)}
                                >
                                    삭제
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* 모든 방 목록 */}
            <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
                <h2 className="text-xl font-semibold mb-4">모든 방들</h2>
                {allRooms.length === 0 ? (
                    <p>현재 활성화된 방이 없습니다.</p>
                ) : (
                    <ul>
                        {allRooms.map((room) => (
                            <li key={room.id} className="mb-2">
                                {room.name} ({room.id}) - {room.category}
                                {room.isPrivate && " 🔒"}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

