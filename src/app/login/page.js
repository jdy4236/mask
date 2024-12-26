// src/app/login/page.js

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async () => {
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("nickname", data.nickname);
                router.push("/dashboard");
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error("Login error:", err);
            setError("로그인 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl font-bold mb-6">Login</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border p-2 rounded mb-4 w-full max-w-sm"
            />
            <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border p-2 rounded mb-4 w-full max-w-sm"
            />
            <button
                onClick={handleLogin}
                className="px-4 py-2 bg-blue-500 text-white rounded w-full max-w-sm"
            >
                로그인
            </button>
        </div>
    );
}
