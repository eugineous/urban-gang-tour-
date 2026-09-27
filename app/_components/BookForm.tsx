'use client';

import { FormEvent, useRef, useState } from 'react';
import { FormField, formErrorProps, MoneyButton, StickerChip } from '@/app/_components/ugt';

type State = 'idle' | 'sending' | 'sent' | 'error';

function requestId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`; }
}

export function BookForm() {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const id = useRef('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!id.current) id.current = requestId();
    setState('sending'); setError('');
    try {
      const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        name: form.get('name'), org: form.get('org'), email: form.get('email'), phone: form.get('phone'), type: 'School Booking', message: form.get('message'), schoolContactConfirmed: form.get('schoolContactConfirmed') === 'on', requestId: id.current,
      }) });
      if (!response.ok) throw new Error('booking_not_accepted');
      setState('sent'); event.currentTarget.reset();
    } catch { setState('error'); setError('Could not send that yet. Please try again.'); }
  }

  if (state === 'sent') return <section className="ugt-book-form ugt-book-form--sent" aria-live="polite"><StickerChip tone="yellow">Signal received</StickerChip><h2>We have your request.</h2><p>The team will review the details before confirming anything in writing.</p></section>;

  return <form className="ugt-book-form" onSubmit={submit} noValidate>
    <div className="ugt-book-form__step"><span>01</span><p>Tell us where</p></div>
    <div className="ugt-book-form__grid">
      <FormField id="book-name" label="Your name" error={error ? ' ' : undefined}><input id="book-name" name="name" autoComplete="name" required minLength={2} {...formErrorProps('book-name', error)} /></FormField>
      <FormField id="book-org" label="School or organisation" error={error ? ' ' : undefined}><input id="book-org" name="org" autoComplete="organization" required {...formErrorProps('book-org', error)} /></FormField>
      <FormField id="book-email" label="Email"><input id="book-email" name="email" type="email" autoComplete="email" required /></FormField>
      <FormField id="book-phone" label="Phone (optional)"><input id="book-phone" name="phone" type="tel" autoComplete="tel" /></FormField>
    </div>
    <FormField id="book-message" label="What are you planning?"><textarea id="book-message" name="message" rows={5} required minLength={10} placeholder="A school or campus event, the kind of space you are planning, and what you want to explore." /></FormField>
    <label className="ugt-book-form__consent"><input name="schoolContactConfirmed" type="checkbox" required /> <span>I am an authorised adult or institution contact. I will not submit student names, health information, or other sensitive personal details here.</span></label>
    {error ? <p className="ugt-book-form__error" role="alert">{error}</p> : null}
    <button className="ugt-money-btn" disabled={state === 'sending'}>{state === 'sending' ? 'Sending signal…' : 'Send booking request →'}</button>
  </form>;
}
