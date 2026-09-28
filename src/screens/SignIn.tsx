import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { sendCode, verifyCode } from '../account';
import { CloudError } from '../cloudTypes';
import { PrimaryButton, Screen } from '../components/Screen';

const field =
  'h-12 w-full min-w-0 rounded-xl bg-white border border-zinc-300 px-4 text-lg focus:outline-none focus:border-red-600';

const message = (e: unknown) =>
  e instanceof CloudError ? e.message : "Something went wrong. Check your connection and try again.";

// Two steps: email → 6-digit code. The email also carries a link, which works when
// opened in the same browser; the code is what works inside the installed iPhone app.
export function SignIn() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const validCode = /^\d{6,10}$/.test(code.trim()); // Supabase's code length is configurable (6 by default)

  const requestCode = async (resend = false) => {
    if (!validEmail || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await sendCode(email);
      // Render the code field synchronously so focusing it stays inside the tap (iOS keypad).
      flushSync(() => {
        setStep('code');
        if (resend) setNotice('New code sent.');
      });
      codeRef.current?.focus();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!validCode || busy) return;
    setBusy(true);
    setError('');
    try {
      await verifyCode(email, code);
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Overload"
      subtitle="Sign in to sync your training"
      action={
        step === 'email' ? (
          <PrimaryButton disabled={!validEmail || busy} onClick={() => void requestCode()}>
            {busy ? 'Sending…' : 'Email me a sign-in code'}
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled={!validCode || busy} onClick={() => void confirm()}>
            {busy ? 'Checking…' : 'Sign in'}
          </PrimaryButton>
        )
      }
    >
      {step === 'email' ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void requestCode();
          }}
        >
          <label className="block space-y-2">
            <span className="block text-lg font-semibold">Your email</span>
            <input
              id="signin-email"
              className={field}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="send"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <p className="text-sm text-zinc-600">This app is invite only. Use the email address the owner added.</p>
          <button type="submit" hidden />
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
        >
          <label className="block space-y-2">
            <span className="block text-lg font-semibold">Sign-in code</span>
            <span className="block text-sm text-zinc-600">
              Sent to <span className="font-medium text-zinc-800 break-all">{email.trim().toLowerCase()}</span>. It can take a
              minute to arrive; check spam too.
            </span>
            <input
              id="signin-code"
              ref={codeRef}
              className={`${field} text-2xl text-center tracking-[0.4em] tabular-nums`}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={10}
              enterKeyHint="go"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </label>
          <button type="submit" hidden />
          <div className="flex gap-4 text-sm">
            <button
              type="button"
              className="h-12 text-red-700 underline underline-offset-2"
              disabled={busy}
              onClick={() => void requestCode(true)}
            >
              Send a new code
            </button>
            <button
              type="button"
              className="h-12 text-zinc-600 underline underline-offset-2"
              onClick={() => {
                setStep('email');
                setCode('');
                setError('');
                setNotice('');
              }}
            >
              Use a different email
            </button>
          </div>
        </form>
      )}

      {notice && !error && (
        <p role="status" className="text-sm text-zinc-700">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </p>
      )}
    </Screen>
  );
}
