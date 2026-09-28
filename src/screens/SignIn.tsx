import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { isTestMode, sendCode, testAccounts, verifyCode } from '../account';
import { CloudError } from '../cloudTypes';
import { PrimaryButton } from '../components/Screen';
import { Lock, Mail } from '../components/Icons';

const message = (e: unknown) =>
  e instanceof CloudError ? e.message : 'Something went wrong. Check your connection and try again.';

const CODE_LENGTH = 6;

// Two steps: email → code. The email also carries a link, which works when opened in
// the same browser; the code is what works inside the installed iPhone app.
export function SignIn() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const test = isTestMode();

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const validCode = /^\d{6,10}$/.test(code.trim()); // Supabase's code length is configurable (6 by default)
  const shownEmail = email.trim().toLowerCase();

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
        if (resend) {
          setCode('');
          setNotice('New code sent.');
        }
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

  const back = () => {
    setStep('email');
    setCode('');
    setError('');
    setNotice('');
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 max-w-md w-full mx-auto px-5 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1.5rem))] pb-40 space-y-8">
        <header className="flex flex-col items-center text-center gap-3">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={64} height={64} className="rounded-2xl shadow-sm" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Overload</h1>
            <p className="text-zinc-600">Your training, backed up and on every device.</p>
          </div>
        </header>

        <ol className="flex items-center justify-center gap-3 text-sm" aria-label="Sign-in steps">
          <StepDot n={1} label="Email" state={step === 'email' ? 'current' : 'done'} />
          <span className="h-px w-8 bg-zinc-300" aria-hidden="true" />
          <StepDot n={2} label="Code" state={step === 'code' ? 'current' : 'todo'} />
        </ol>

        <section className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-5 space-y-4">
          {step === 'email' ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void requestCode();
              }}
            >
              <label className="block space-y-2" htmlFor="signin-email">
                <span className="flex items-center gap-2 text-lg font-semibold">
                  <Mail className="w-5 h-5 text-red-700" /> Your email
                </span>
                <span className="block text-sm text-zinc-600">We'll email you a code to sign in. No password needed.</span>
              </label>
              <input
                id="signin-email"
                ref={emailRef}
                className="h-12 w-full min-w-0 rounded-xl bg-white border border-zinc-300 px-4 text-lg focus:outline-none focus:border-red-600"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="send"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-zinc-500">Invite only: use the email address the app owner added.</p>
              <button type="submit" hidden />
            </form>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void confirm();
              }}
            >
              <label className="block space-y-2" htmlFor="signin-code">
                <span className="flex items-center gap-2 text-lg font-semibold">
                  <Lock className="w-5 h-5 text-red-700" /> Enter your code
                </span>
                <span className="block text-sm text-zinc-600">
                  Sent to <span className="font-medium text-zinc-800 break-all">{shownEmail}</span>. It can take a minute
                  to arrive; check spam too.
                </span>
              </label>
              <CodeBoxes value={code} focus={() => codeRef.current?.focus()} />
              <input
                id="signin-code"
                ref={codeRef}
                aria-label="Sign-in code"
                className="sr-only"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={10}
                enterKeyHint="go"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
              <div className="flex flex-wrap gap-x-5 text-sm">
                <button type="button" className="h-12 text-red-700 underline underline-offset-2" disabled={busy} onClick={() => void requestCode(true)}>
                  Send a new code
                </button>
                <button type="button" className="h-12 text-zinc-600 underline underline-offset-2" onClick={back}>
                  Use a different email
                </button>
              </div>
              <button type="submit" hidden />
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
        </section>

        {test && (
          <TestModePanel
            step={step}
            onPick={(e) => {
              setEmail(e);
              setError('');
              emailRef.current?.focus();
            }}
          />
        )}
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-zinc-200 pb-[calc(env(safe-area-inset-bottom)+var(--host-badge-offset))]">
        <div className="max-w-md mx-auto px-5 py-3">
          {step === 'email' ? (
            <PrimaryButton disabled={!validEmail || busy} onClick={() => void requestCode()}>
              {busy ? 'Sending…' : 'Email me a sign-in code'}
            </PrimaryButton>
          ) : (
            <PrimaryButton disabled={!validCode || busy} onClick={() => void confirm()}>
              {busy ? 'Checking…' : 'Sign in'}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDot({ n, label, state }: { n: number; label: string; state: 'done' | 'current' | 'todo' }) {
  const dot =
    state === 'current'
      ? 'bg-red-700 text-white'
      : state === 'done'
        ? 'bg-red-100 text-red-800'
        : 'bg-zinc-200 text-zinc-600';
  return (
    <li className="flex items-center gap-2" aria-current={state === 'current' ? 'step' : undefined}>
      <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${dot}`}>{state === 'done' ? '✓' : n}</span>
      <span className={state === 'todo' ? 'text-zinc-500' : 'font-medium text-zinc-800'}>{label}</span>
    </li>
  );
}

// Six large boxes showing the digits typed into the (visually hidden) code input.
// One real input underneath keeps paste and iOS "From Messages/Mail" autofill working.
function CodeBoxes({ value, focus }: { value: string; focus: () => void }) {
  const digits = value.padEnd(Math.max(CODE_LENGTH, value.length)).split('');
  const active = Math.min(value.length, digits.length - 1);
  return (
    <div className="flex justify-between gap-2" onClick={focus} aria-hidden="true">
      {digits.map((d, i) => (
        <span
          key={i}
          className={`grid h-14 min-w-0 flex-1 place-items-center rounded-xl border bg-white text-2xl font-semibold tabular-nums ${
            i === active ? 'border-red-600 ring-2 ring-red-100' : 'border-zinc-300'
          }`}
        >
          {d.trim()}
        </span>
      ))}
    </div>
  );
}

function TestModePanel({ step, onPick }: { step: 'email' | 'code'; onPick: (email: string) => void }) {
  const { emails, code } = testAccounts();
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3" aria-labelledby="test-mode-label">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900">TEST MODE</span>
        <h2 id="test-mode-label" className="text-sm font-semibold text-amber-900">
          Not real accounts
        </h2>
      </div>
      <p className="text-sm text-amber-900">
        This preview uses a pretend backend on this device. No emails are sent. Use a test account below with code{' '}
        <strong className="tabular-nums tracking-wider">{code}</strong>.
      </p>
      {step === 'email' && (
        <div className="flex flex-wrap gap-2">
          {emails.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onPick(e)}
              className="h-10 rounded-full border border-amber-300 bg-white px-3 text-sm text-amber-950 active:bg-amber-100"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
