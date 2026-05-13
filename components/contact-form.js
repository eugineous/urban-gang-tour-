"use client";

import { useState } from "react";

export function ContactForm({ email, whatsapp }) {
  const [note, setNote] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const inquiryType = formData.get("inquiryType")?.toString().trim() || "School booking";
    const institutionName = formData.get("institutionName")?.toString().trim() || "New enquiry";
    const contactName = formData.get("contactName")?.toString().trim() || "";
    const contactRole = formData.get("contactRole")?.toString().trim() || "";
    const county = formData.get("county")?.toString().trim() || "";
    const audienceSize = formData.get("audienceSize")?.toString().trim() || "";
    const date = formData.get("date")?.toString().trim() || "";
    const emailAddress = formData.get("emailAddress")?.toString().trim() || "";
    const reason = formData.get("reason")?.toString().trim() || "";

    const subject = `Urban Gang Tour ${inquiryType} | ${institutionName}`;
    const body = [
      "Urban Gang Tour website enquiry",
      "",
      `Enquiry type: ${inquiryType}`,
      `Institution or brand: ${institutionName}`,
      `Contact name: ${contactName || "Not provided"}`,
      `Role: ${contactRole || "Not provided"}`,
      `Email: ${emailAddress || "Not provided"}`,
      `County: ${county || "Not provided"}`,
      `Audience size: ${audienceSize || "Not provided"}`,
      `Preferred date or timeline: ${date || "Not provided"}`,
      "",
      "Brief:",
      reason || "Not provided",
      "",
      "Sent from the Urban Gang Tour website."
    ].join("\n");

    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setNote("Opening your email app with a pre-filled brief...");
  }

  return (
    <form data-booking-form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="inquiryType">Enquiry type</label>
          <select id="inquiryType" name="inquiryType" defaultValue="School booking">
            <option>School booking</option>
            <option>University or college booking</option>
            <option>Event or festival partnership</option>
            <option>Sponsor conversation</option>
            <option>Church partnership</option>
            <option>Media request</option>
            <option>Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="institutionName">Institution or brand name</label>
          <input id="institutionName" name="institutionName" required />
        </div>
        <div className="field">
          <label htmlFor="contactName">Your name</label>
          <input id="contactName" name="contactName" />
        </div>
        <div className="field">
          <label htmlFor="contactRole">Your role</label>
          <select id="contactRole" name="contactRole" defaultValue="Principal">
            <option>Principal</option>
            <option>Deputy Principal</option>
            <option>Teacher or patron</option>
            <option>Student leader</option>
            <option>University or college representative</option>
            <option>Event organiser</option>
            <option>Government or county official</option>
            <option>Brand representative</option>
            <option>Corporate CSR manager</option>
            <option>Church leader</option>
            <option>Media representative</option>
            <option>Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="emailAddress">Your email</label>
          <input id="emailAddress" name="emailAddress" type="email" />
        </div>
        <div className="field">
          <label htmlFor="county">County or city</label>
          <input id="county" name="county" />
        </div>
        <div className="field">
          <label htmlFor="audienceSize">Expected audience size</label>
          <input id="audienceSize" name="audienceSize" placeholder="Optional" />
        </div>
        <div className="field">
          <label htmlFor="date">Preferred date or timeline</label>
          <input id="date" name="date" placeholder="Term / month / exact day" />
        </div>
        <div className="field field--full">
          <label htmlFor="reason">Tell us about your goals or what you need</label>
          <textarea
            id="reason"
            name="reason"
            placeholder="Your students, your event, your sponsorship interest, or the kind of collaboration you want to build."
          />
        </div>
      </div>
      <div className="button-row" style={{ marginTop: "1.2rem" }}>
        <button className="button" type="submit">
          Send brief via email
        </button>
        {whatsapp && (
          <a
            className="button button--ghost"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp instead
          </a>
        )}
      </div>
      {note && <p className="form-note" style={{ marginTop: "0.75rem", fontSize: "0.88rem", color: "var(--ugt-ink-muted)" }}>{note}</p>}
    </form>
  );
}
