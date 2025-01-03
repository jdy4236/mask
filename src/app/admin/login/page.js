// src/app/admin/login/page.js

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                // 토큰과 닉네임을 로컬 스토리지에 저장
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminNickname', data.nickname);
                // 관리자 대시보드로 리디렉션
                router.push('/admin');
            } else {
                setError(data.error || "Login failed");
            }
        } catch (err) {
            console.error("Login error:", err);
            setError("An error occurred during login");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-800">
            <form onSubmit={handleLogin} className="bg-gray-900 p-8 rounded shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-white">Admin Login</h2>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <div className="mb-4">
                    <label className="block text-gray-300">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full p-2 mt-1 bg-gray-700 text-white rounded"
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-300">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full p-2 mt-1 bg-gray-700 text-white rounded"
                    />
                </div>
                <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Login
                </button>
            </form>
        </div>
    );
}
