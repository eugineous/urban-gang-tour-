import type { ReactNode } from 'react';

export function formErrorProps(id: string, error?: string) {
  if (!error) return {};
  return { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` };
}

export function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="ugt-field" htmlFor={id}>
      <span className="ugt-field__label">{label}</span>
      {children}
      {error ? (
        <span id={`${id}-error`} className="ugt-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}