// src/app/login/page.js

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async () => {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (res.ok) {
            // 토큰 저장 및 리다이렉트
            localStorage.setItem("token", data.token);
            router.push("/");
        } else {
            setError(data.error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl font-bold mb-6">Login</h1>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <input
                type="email"
                placeholder="Email"
                className="border p-2 rounded mb-4"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                className="border p-2 rounded mb-4"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={handleLogin}
            >
                Login
            </button>
        </div>
    );
}
