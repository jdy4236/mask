// src/components/Navbar.js

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from './Navbar.module.css';

export default function Navbar() {
    const router = useRouter();
    const [nickname, setNickname] = useState("");

    useEffect(() => {
        // 로컬 스토리지에서 닉네임 가져오기
        if (typeof window !== "undefined") {
            const storedNickname = localStorage.getItem("nickname");
            setNickname(storedNickname || "익명");
        }
    }, []);

    const handleLogout = () => {
        // 로컬 스토리지에서 토큰과 닉네임 제거
        localStorage.removeItem("token");
        localStorage.removeItem("nickname");
        // 로그인 페이지로 리디렉션
        router.push("/login");
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.logo}>MOOINN</div>
            <div className={styles.navItems}>
                <span className={styles.greeting}>안녕하세요, {nickname}님!</span>
                <button
                    onClick={handleLogout}
                    className={styles.logoutButton}
                >
                    로그아웃
                </button>
            </div>
        </nav>
    );
}
