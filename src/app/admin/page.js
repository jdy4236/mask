// src/app/admin/page.js

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import Chart from 'chart.js/auto'; // 차트 라이브러리 (예: Chart.js)

export default function AdminDashboard() {
    const [adminToken, setAdminToken] = useState(null);
    const [nickname, setNickname] = useState("");
    const [totalStats, setTotalStats] = useState({ totalRooms: 0, totalUsers: 0, activeUsers: 0 });
    const [roomDetails, setRoomDetails] = useState([]);
    const [userStats, setUserStats] = useState([]);
    const [dailyMessageStats, setDailyMessageStats] = useState([]);
    const [systemStatus, setSystemStatus] = useState({ dbStatus: 'Unknown', serverLoad: 'Unknown' });
    const [serverResourceUsage, setServerResourceUsage] = useState({ cpuLoad: [], memoryUsage: [] });
    const [adminUsers, setAdminUsers] = useState([]);
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [newAdminPassword, setNewAdminPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("adminToken");
        const storedNickname = localStorage.getItem("adminNickname");
        if (!token) {
            router.push("/admin/login");
            return;
        }
        setAdminToken(token);
        setNickname(storedNickname || "");

        // Socket.io 초기화
        const socketInstance = io(window.location.origin, {
            path: "/socket.io",
            query: { token }, // 토큰 전달
            transports: ["websocket"],
        });

        setSocket(socketInstance);

        // 실시간 데이터 수신
        socketInstance.on("connect", () => {
            console.log("관리자 소켓 서버에 연결됨");
            // 초기 데이터 요청
            socketInstance.emit("adminGetTotalStats");
            socketInstance.emit("adminGetRoomDetails");
            socketInstance.emit("adminGetUserStats");
            socketInstance.emit("adminGetDailyMessageStats");
            socketInstance.emit("adminGetSystemStatus");
            socketInstance.emit("adminGetServerResourceUsage");
            socketInstance.emit("adminGetAdminUsers");
        });

        // 총 통계 수신
        socketInstance.on("adminTotalStats", (data) => {
            console.log("Received adminTotalStats:", data); // 로그 추가
            setTotalStats(data);
        });

        // 방 세부 정보 수신
        socketInstance.on("adminRoomDetails", (data) => {
            console.log("Received adminRoomDetails:", data); // 로그 추가
            setRoomDetails(data);
        });

        // 사용자 통계 수신
        socketInstance.on("adminUserStats", (data) => {
            console.log("Received adminUserStats:", data); // 로그 추가
            setUserStats(data);
            // 차트 업데이트
            renderUserStatsChart(data);
        });

        // 일별 메시지 통계 수신
        socketInstance.on("adminDailyMessageStats", (data) => {
            console.log("Received adminDailyMessageStats:", data); // 로그 추가
            setDailyMessageStats(data);
            // 차트 업데이트
            renderDailyMessageStatsChart(data);
        });

        // 시스템 상태 수신
        socketInstance.on("adminSystemStatus", (data) => {
            console.log("Received adminSystemStatus:", data); // 로그 추가
            setSystemStatus(data);
        });

        // 서버 리소스 사용량 수신
        socketInstance.on("adminServerResourceUsage", (data) => {
            console.log("Received adminServerResourceUsage:", data); // 로그 추가
            setServerResourceUsage(data);
            // 차트 업데이트
            renderServerResourceUsageChart(data);
        });

        // 관리자 사용자 목록 수신
        socketInstance.on("adminAdminUsers", (data) => {
            console.log("Received adminAdminUsers:", data); // 로그 추가
            setAdminUsers(data);
        });

        // 에러 핸들링
        socketInstance.on("error", (data) => {
            console.error("Socket.io error:", data);
            setError(data.message);
        });

        // 클린업 함수
        return () => {
            socketInstance.off("adminTotalStats");
            socketInstance.off("adminRoomDetails");
            socketInstance.off("adminUserStats");
            socketInstance.off("adminDailyMessageStats");
            socketInstance.off("adminSystemStatus");
            socketInstance.off("adminServerResourceUsage");
            socketInstance.off("adminAdminUsers");
            socketInstance.off("error");
            socketInstance.disconnect();
        };
    }, [router]);

    // Socket 객체가 변경될 때마다 관리자 전용 로직을 실행
    useEffect(() => {
        if (socket && socket.role === 'admin') {
            // 관리자 전용 로직을 여기에 추가
            console.log("Admin-specific logic can be executed here.");
        }
    }, [socket]);

    // 사용자 통계 차트 렌더링 함수
    const renderUserStatsChart = (data) => {
        const ctx = document.getElementById('userStatsChart').getContext('2d');
        // 기존 차트가 있을 경우 제거
        if (window.userStatsChartInstance) {
            window.userStatsChartInstance.destroy();
        }
        window.userStatsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.hour),
                datasets: [{
                    label: '시간대별 사용자 수',
                    data: data.map(item => item.count),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // 비율 고정 해제
                scales: {
                    y: {
                        beginAtZero: true,
                        precision: 0,
                    }
                }
            }
        });
    };

    // 일별 메시지 통계 차트 렌더링 함수
    const renderDailyMessageStatsChart = (data) => {
        const ctx = document.getElementById('dailyMessageStatsChart').getContext('2d');
        // 기존 차트가 있을 경우 제거
        if (window.dailyMessageStatsChartInstance) {
            window.dailyMessageStatsChartInstance.destroy();
        }
        window.dailyMessageStatsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.date),
                datasets: [{
                    label: '일별 메시지 수',
                    data: data.map(item => item.count),
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // 비율 고정 해제
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 10,
                        }
                    },
                    y: {
                        beginAtZero: true,
                        precision: 0,
                    }
                }
            }
        });
    };

    // 서버 리소스 사용량 차트 렌더링 함수
    const renderServerResourceUsageChart = (data) => {
        const ctxCPU = document.getElementById('serverCpuLoadChart').getContext('2d');
        const ctxMemory = document.getElementById('serverMemoryUsageChart').getContext('2d');

        // CPU Load 차트
        if (window.serverCpuLoadChartInstance) {
            window.serverCpuLoadChartInstance.destroy();
        }
        window.serverCpuLoadChartInstance = new Chart(ctxCPU, {
            type: 'line',
            data: {
                labels: data.cpuLoad.map(item => item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Unknown'),
                datasets: [
                    {
                        label: '1분',
                        data: data.cpuLoad.map(item => item.load1),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: false,
                    },
                    {
                        label: '5분',
                        data: data.cpuLoad.map(item => item.load5),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        fill: false,
                    },
                    {
                        label: '15분',
                        data: data.cpuLoad.map(item => item.load15),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // 비율 고정 해제
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 10,
                        }
                    },
                    y: {
                        beginAtZero: true,
                    }
                }
            }
        });

        // Memory Usage 차트
        if (window.serverMemoryUsageChartInstance) {
            window.serverMemoryUsageChartInstance.destroy();
        }
        window.serverMemoryUsageChartInstance = new Chart(ctxMemory, {
            type: 'line',
            data: {
                labels: data.memoryUsage.map(item => item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Unknown'),
                datasets: [{
                    label: '메모리 사용량 (MB)',
                    data: data.memoryUsage.map(item => item.memory),
                    borderColor: 'rgba(255, 206, 86, 1)',
                    backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // 비율 고정 해제
                scales: {
                    x: {
                        ticks: {
                            maxTicksLimit: 10,
                        }
                    },
                    y: {
                        beginAtZero: true,
                    }
                }
            }
        });
    };

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        if (!newAdminEmail || !newAdminPassword) {
            setError("이메일과 비밀번호를 입력해주세요.");
            return;
        }
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${adminToken}`,
                },
                body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                alert("새로운 관리자 계정이 추가되었습니다.");
                setNewAdminEmail("");
                setNewAdminPassword("");
                // 관리자 사용자 목록 갱신
                socket.emit("adminGetAdminUsers");
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error("관리자 추가 오류:", err);
            setError("관리자 추가 중 오류가 발생했습니다.");
        }
    };

    const handleDeleteAdmin = async (adminId) => {
        if (!confirm("정말로 이 관리자 계정을 삭제하시겠습니까?")) return;
        try {
            const res = await fetch(`/api/admin/users/${adminId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${adminToken}`,
                },
            });
            const data = await res.json();
            if (res.ok) {
                alert("관리자 계정이 삭제되었습니다.");
                // 관리자 사용자 목록 갱신
                socket.emit("adminGetAdminUsers");
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error("관리자 삭제 오류:", err);
            setError("관리자 삭제 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="min-h-screen bg-custom-bg text-white p-6">
            <h1 className="text-3xl font-bold mb-6">관리자 대시보드</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}

            {/* 총 통계 */}
            <section className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">총 통계</h2>
                <div className="flex flex-wrap space-x-4">
                    <div className="p-4 bg-button-bg rounded shadow w-40 mb-4">
                        <h3 className="text-xl">방의 총 개수</h3>
                        <p className="text-3xl">{totalStats.totalRooms}</p>
                    </div>
                    <div className="p-4 bg-button-bg rounded shadow w-40 mb-4">
                        <h3 className="text-xl">현재 회원가입자 수</h3>
                        <p className="text-3xl">{totalStats.totalUsers}</p>
                    </div>
                    <div className="p-4 bg-button-bg rounded shadow w-40 mb-4">
                        <h3 className="text-xl">실시간 활성 사용자 수</h3>
                        <p className="text-3xl">{totalStats.activeUsers}</p>
                    </div>
                </div>
            </section>

            {/* 방별 세부 정보 */}
            <section className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">방별 세부 정보</h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
                    {roomDetails.map(room => (
                        <div key={room.roomId} className="p-2 bg-button-bg rounded shadow flex flex-col justify-between w-auto">
                            <div>
                                <h3 className="text-lg font-semibold">{room.roomName}</h3>
                                <p className="mt-1 text-sm">사용자 수: {room.userCount}</p>
                            </div>
                            <div className="mt-2 flex items-center">
                                <span className={`h-3 w-3 rounded-full ${room.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                <span className="ml-1 text-sm">{room.isActive ? '활성' : '비활성'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 그래프 섹션 */}
            <section className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">통계 그래프</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 상단 그래프 2개 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 시간대별 사용자 수 */}
                        <div className="bg-button-bg p-4 rounded shadow h-60">
                            <h3 className="text-lg font-semibold mb-2">시간대별 사용자 수</h3>
                            <canvas id="userStatsChart" className="h-full"></canvas>
                        </div>
                        {/* 일별 메시지 통계 */}
                        <div className="bg-button-bg p-4 rounded shadow h-60">
                            <h3 className="text-lg font-semibold mb-2">일별 메시지 통계</h3>
                            <canvas id="dailyMessageStatsChart" className="h-full"></canvas>
                        </div>
                    </div>
                    {/* 하단 그래프 2개 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* CPU 로드 */}
                        <div className="bg-button-bg p-4 rounded shadow h-60">
                            <h3 className="text-lg font-semibold mb-2">CPU 로드</h3>
                            <canvas id="serverCpuLoadChart" className="h-full"></canvas>
                        </div>
                        {/* 메모리 사용량 */}
                        <div className="bg-button-bg p-4 rounded shadow h-60">
                            <h3 className="text-lg font-semibold mb-2">메모리 사용량</h3>
                            <canvas id="serverMemoryUsageChart" className="h-full"></canvas>
                        </div>
                    </div>
                </div>
            </section>

            {/* 시스템 유지보수 */}
            <section className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">시스템 유지보수</h2>
                <div className="flex flex-wrap space-x-4">
                    <div className="p-4 bg-button-bg rounded shadow w-40 mb-4">
                        <h3 className="text-xl">데이터베이스 상태</h3>
                        <p className="text-2xl">{systemStatus.dbStatus}</p>
                    </div>
                    <div className="p-4 bg-button-bg rounded shadow w-40 mb-4">
                        <h3 className="text-xl">서버 리소스</h3>
                        <p className="text-2xl">{systemStatus.serverLoad}</p>
                    </div>
                </div>
            </section>

            {/* 관리자 사용자 관리 */}
            <section>
                <h2 className="text-2xl font-semibold mb-4">관리자 사용자 관리</h2>
                <form onSubmit={handleAddAdmin} className="mb-4">
                    <div className="flex flex-wrap space-x-2">
                        <input
                            type="email"
                            placeholder="새 관리자 이메일"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            required
                            className="flex-1 p-2 bg-input-bg border border-input-border rounded mb-2 sm:mb-0"
                        />
                        <input
                            type="password"
                            placeholder="비밀번호"
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            required
                            className="flex-1 p-2 bg-input-bg border border-input-border rounded mb-2 sm:mb-0"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-green-500 rounded hover:bg-green-600"
                        >
                            추가
                        </button>
                    </div>
                </form>
                <div className="overflow-x-auto">
                    <ul>
                        {adminUsers.map(admin => (
                            <li key={admin.id} className="flex justify-between items-center p-2 bg-button-bg rounded mb-2">
                                <span>{admin.email}</span>
                                <button
                                    onClick={() => handleDeleteAdmin(admin.id)}
                                    className="px-3 py-1 bg-red-500 rounded hover:bg-red-600"
                                >
                                    삭제
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </div>
    );
}
