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
    return <p className="text-primary">Loading...</p>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-main">
      <h1 className="text-3xl font-bold mb-6 text-primary">MOOINN</h1>
      <div className="flex space-x-4">
        <button
          className="px-4 py-2 bg-button-background text-white rounded hover:bg-button-hover shadow-neon"
          onClick={() => router.push("/login")}
        >
          Login
        </button>
        <button
          className="px-4 py-2 bg-secondary text-white rounded hover:bg-secondary-dark shadow-neon"
          onClick={() => router.push("/signup")}
        >
          Signup
        </button>
      </div>
    </div>
  );
}
