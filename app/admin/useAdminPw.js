"use client";
import { useState, useEffect } from "react";

export function useAdminPw() {
  const [pw, setPw] = useState("");
  useEffect(() => {
    const saved = sessionStorage.getItem("ugt_admin_pw") ?? "";
    setPw(saved);
  }, []);
  return [pw, (v) => { setPw(v); sessionStorage.setItem("ugt_admin_pw", v); }];
}
