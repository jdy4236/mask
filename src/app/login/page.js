// src/app/login/page.js

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault(); // 폼 제출 시 페이지 리로드 방지
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-custom-bg">
            <h1 className="text-3xl font-bold mb-6 text-white">Login</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleLogin} className="w-full max-w-sm">
                <input
                    type="email"
                    placeholder="이메일"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border border-input-border p-2 rounded mb-4 w-full bg-input-bg text-white"
                />
                <input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border border-input-border p-2 rounded mb-4 w-full bg-input-bg text-white"
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-button-bg border border-button-border text-white rounded w-full transition duration-200 ease-in-out hover:brightness-200"
                >
                    로그인
                </button>
            </form>
        </div>
    );
}
