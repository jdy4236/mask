// src/app/page.js

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
      router.push("/dashboard");
    }
  }, [router]);

  if (isAuthenticated) {
    return <p>Loading...</p>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-custom-bg">
      <h1 className="text-3xl font-bold mb-6 text-white">INN</h1>
      <div className="flex space-x-4">
        <button
          className="px-4 py-2 bg-button-bg border border-button-border text-white rounded"
          onClick={() => router.push("/login")}
        >
          Login
        </button>
        <button
          className="px-4 py-2 bg-button-bg border border-button-border text-white rounded"
          onClick={() => router.push("/signup")}
        >
          Signup
        </button>
      </div>
    </div>
  );
}
