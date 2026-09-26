import { describe, expect, it } from 'vitest';
import { formErrorProps } from '@/app/_components/ugt/FormField';

describe('FormField a11y helpers', () => {
  it('wires aria-invalid and describedby only when error present', () => {
    expect(formErrorProps('email')).toEqual({});
    expect(formErrorProps('email', 'invalid_email')).toEqual({
      'aria-invalid': true,
      'aria-describedby': 'email-error',
    });
  });
});