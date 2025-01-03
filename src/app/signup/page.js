// src/app/signup/page.js

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleRegister = async () => {
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname, email, password }),
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
            console.error("Registration error:", err);
            setError("회원가입 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-custom-bg">
            <h1 className="text-3xl font-bold mb-6 text-white">Register</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <input
                type="text"
                placeholder="닉네임"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="border border-input-border p-2 rounded mb-4 w-full max-w-sm bg-input-bg text-white"
            />
            <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-input-border p-2 rounded mb-4 w-full max-w-sm bg-input-bg text-white"
            />
            <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-input-border p-2 rounded mb-4 w-full max-w-sm bg-input-bg text-white"
            />
            <button
                onClick={handleRegister}
                className="px-4 py-2 bg-button-bg border border-button-border text-white rounded w-full max-w-sm transition duration-200 ease-in-out hover:brightness-200"
            >
                회원가입
            </button>
        </div>
    );
}
