"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

const COLOR_MAP = {
  magenta: { bg: "#cc0077", text: "#fff" },
  orange:  { bg: "#ff7a00", text: "#fff" },
  green:   { bg: "#2E7D32", text: "#fff" },
  ink:     { bg: "#1A1A1A", text: "#fff" },
};

const STORAGE_KEY = "ugt_banner_dismissed";

export default function AnnouncementBannerClient({ announcement }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (dismissed !== announcement.text) {
      setVisible(true);
    }
  }, [announcement.text]);

  if (!visible) return null;

  const { bg, text } = COLOR_MAP[announcement.color] || COLOR_MAP.magenta;

  return (
    <div
      role="alert"
      style={{
        background: bg,
        color: text,
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        fontSize: "14px",
        fontWeight: 600,
        position: "relative",
        zIndex: 1001,
      }}
    >
      <span style={{ flex: 1, textAlign: "center" }}>{announcement.text}</span>
      <button
        aria-label="Dismiss announcement"
        onClick={() => {
          sessionStorage.setItem(STORAGE_KEY, announcement.text);
          setVisible(false);
        }}
        style={{
          background: "transparent",
          border: "none",
          color: text,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          padding: "4px",
          flexShrink: 0,
          opacity: 0.7,
        }}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
