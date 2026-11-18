import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { sendPasswordResetEmail } from './email.js';

const resetUrl = 'http://localhost:5173/reset-password?token=abc123';

beforeEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('sendPasswordResetEmail without an API key', () => {
  // Local development: no key, so print the link and do not call Resend.
  test('prints the reset link and does not call Resend', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });

    const result = await sendPasswordResetEmail({ to: 'cj@example.com', resetUrl });

    expect(result).toEqual({ sent: false, method: 'console' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy.mock.calls.flat().join(' ')).toContain(resetUrl);
  });
});

describe('sendPasswordResetEmail with an API key', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
  });

  test('posts the email to the Resend API with the key', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'e1' }) });

    const result = await sendPasswordResetEmail({ to: 'cj@example.com', resetUrl });

    expect(result).toEqual({ sent: true, method: 'resend' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(options.body);
    expect(body.to).toEqual(['cj@example.com']);
    expect(body.subject).toMatch(/reset/i);
    expect(body.html).toContain(resetUrl);
    expect(body.text).toContain(resetUrl);
  });

  test('uses EMAIL_FROM as the sender when it is set', async () => {
    process.env.EMAIL_FROM = 'HeyCiti <noreply@heyciti.com>';
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    await sendPasswordResetEmail({ to: 'cj@example.com', resetUrl });

    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).from).toBe('HeyCiti <noreply@heyciti.com>');
  });

  test('throws with the status and body when Resend rejects the email', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 403, text: async () => 'domain not verified' });

    await expect(sendPasswordResetEmail({ to: 'cj@example.com', resetUrl })).rejects.toThrow(
      'Resend error 403: domain not verified'
    );
  });
});
