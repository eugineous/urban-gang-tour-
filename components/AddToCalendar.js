"use client";
import { CalendarPlus } from "lucide-react";

/**
 * AddToCalendar — builds a Google Calendar "Add event" URL and renders a button.
 *
 * Props:
 *   title       {string}  Event name
 *   startDate   {string}  ISO 8601 compact e.g. "20260530T080000"
 *   endDate     {string}  ISO 8601 compact e.g. "20260530T170000" (optional)
 *   location    {string}
 *   description {string}
 */
export default function AddToCalendar({ title, startDate, endDate, location, description }) {
  if (!title || !startDate) return null;

  const dates = endDate ? `${startDate}/${endDate}` : startDate;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
    details: description || "",
    location: location || "",
  });
  const url = `https://calendar.google.com/calendar/render?${params.toString()}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Add "${title}" to Google Calendar`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "var(--ugt-magenta)",
        border: "var(--border-bold)",
        borderRadius: "var(--r-pill)",
        padding: "8px 16px",
        background: "var(--ugt-white)",
        boxShadow: "var(--shadow-sticker-xs)",
        textDecoration: "none",
        transition: "transform var(--dur-base), box-shadow var(--dur-base)",
      }}
    >
      <CalendarPlus size={15} aria-hidden="true" />
      Add to Calendar
    </a>
  );
}
