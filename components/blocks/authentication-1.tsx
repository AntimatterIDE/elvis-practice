"use client";

import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Apple, Check, Eye, EyeOff, Loader2 } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,transform] duration-150 ease-out";

const field =
  "h-9 w-full rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 hover:border-neutral-300 focus:border-neutral-900 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:hover:border-neutral-700 dark:focus:border-white";

const btnPrimary =
  "inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--rb-r-lg,10px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] px-4 text-sm font-medium text-[var(--rb-accent-fg,oklch(100%_0_0))] hover:bg-[color-mix(in_oklab,var(--rb-accent,oklch(20.5%_0_0))_90%,transparent)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))] dark:hover:bg-[color-mix(in_oklab,var(--rb-accent,oklch(100%_0_0))_90%,transparent)]";

const btnProvider =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-3 text-[13px] font-medium text-neutral-900 hover:bg-neutral-50 active:scale-[0.97] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800";

const linkClass =
  "cursor-pointer rounded-[var(--rb-r-xs,4px)] text-neutral-900 underline decoration-neutral-300 underline-offset-[3px] transition-colors duration-150 hover:decoration-neutral-900 dark:text-neutral-100 dark:decoration-neutral-600 dark:hover:decoration-white";

const checkboxClass =
  "peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[var(--rb-r-xs,4px)] border border-neutral-300 bg-white transition-colors duration-150 checked:border-neutral-900 checked:bg-neutral-900 hover:border-neutral-400 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:border-neutral-700 dark:bg-neutral-950 dark:checked:border-white dark:checked:bg-white dark:hover:border-neutral-600 dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const checkboxMark =
  "pointer-events-none absolute h-3 w-3 text-[var(--rb-accent-fg,oklch(100%_0_0))] opacity-0 transition-opacity duration-150 peer-checked:opacity-100 motion-reduce:transition-none dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M21.35 11.1H12v2.98h5.35c-.24 1.4-1.75 4.1-5.35 4.1a5.95 5.95 0 0 1 0-11.9c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.62 14.53 2.7 12 2.7a9.3 9.3 0 1 0 0 18.6c5.25 0 8.73-3.69 8.73-8.88 0-.6-.06-1.05-.14-1.52Z" />
    </svg>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Authentication1() {
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [remember, setRemember] = useState(true);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState<"email" | "password" | null>(null);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!EMAIL.test(email.trim())) {
      setError("email");
      return;
    }
    if (password.length < 8) {
      setError("password");
      return;
    }
    setError(null);
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPending(false), 1400);
  };

  const trackCaps = (event: KeyboardEvent<HTMLInputElement>) => {
    setCaps(event.getModifierState?.("CapsLock") ?? false);
  };

  return (
    <div className="relative flex h-full min-h-[640px] w-full flex-col overflow-hidden bg-white p-8 sm:p-10 dark:bg-neutral-950">
      <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center">
        <div className="rounded-[var(--rb-r-4xl,18px)] border border-neutral-200/70 bg-white p-6 sm:p-7 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                N
              </span>
            </div>
            <h1 className="mt-4 text-xl font-medium tracking-[-0.015em] text-neutral-900 dark:text-neutral-50">
              Sign in
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Continue to the Northwind workspace.
            </p>
          </div>

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor={emailId}
                className="block text-sm font-medium text-neutral-900 dark:text-neutral-100"
              >
                Email or username
              </label>
              <input
                id={emailId}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error === "email") setError(null);
                }}
                placeholder="you@northwind.com"
                aria-invalid={error === "email"}
                aria-describedby={error === "email" ? errorId : undefined}
                className={cx(
                  field,
                  focus,
                  error === "email" && "border-red-500 dark:border-red-500",
                )}
              />
              {error === "email" && (
                <p
                  id={errorId}
                  className="text-xs text-red-600 dark:text-red-400"
                >
                  Enter a valid email address.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <label
                  htmlFor={passwordId}
                  className="block text-sm font-medium text-neutral-900 dark:text-neutral-100"
                >
                  Password
                </label>
                <button
                  type="button"
                  className={cx("text-xs", linkClass, focus)}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id={passwordId}
                  type={reveal ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error === "password") setError(null);
                  }}
                  onKeyUp={trackCaps}
                  onKeyDown={trackCaps}
                  onBlur={() => setCaps(false)}
                  placeholder="Enter your password"
                  aria-invalid={error === "password"}
                  className={cx(
                    field,
                    focus,
                    "pr-10",
                    error === "password" &&
                      "border-red-500 dark:border-red-500",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? "Hide password" : "Show password"}
                  className={cx(
                    "absolute top-1 right-1 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--rb-r-sm,6px)] bg-neutral-100 text-neutral-600 hover:bg-neutral-200 active:scale-[0.97] dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
                    transition,
                    focus,
                  )}
                >
                  {reveal ? (
                    <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {error === "password" ? (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Passwords are at least 8 characters.
                </p>
              ) : caps ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Caps Lock is on.
                </p>
              ) : null}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-600 dark:text-neutral-400">
              <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className={checkboxClass}
                />
                <Check
                  aria-hidden="true"
                  strokeWidth={3}
                  className={checkboxMark}
                />
              </span>
              Keep me signed in for 30 days
            </label>

            <button
              type="submit"
              disabled={pending}
              className={cx(btnPrimary, transition, focus)}
            >
              {pending && (
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                />
              )}
              {pending ? "Signing in" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Or continue with
            </span>
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              className={cx(btnProvider, transition, focus)}
            >
              <GoogleMark className="h-4 w-4" />
              Google
            </button>
            <button
              type="button"
              className={cx(btnProvider, transition, focus)}
            >
              <Apple aria-hidden="true" className="h-4 w-4" />
              Apple
            </button>
            <button
              type="button"
              className={cx(btnProvider, transition, focus)}
            >
              <span aria-hidden="true" className="text-xs font-medium">GH</span>
              GitHub
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Need an account?{" "}
          <button type="button" className={cx("font-medium", linkClass, focus)}>
            Create one
          </button>
        </p>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          {["Privacy", "Terms", "Status"].map((item) => (
            <button
              key={item}
              type="button"
              className={cx(
                "cursor-pointer rounded-[var(--rb-r-xs,4px)] transition-colors duration-150 hover:text-neutral-900 dark:hover:text-neutral-100",
                focus,
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
