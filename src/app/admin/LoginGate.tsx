/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app */

"use client";

import { useState, type FormEvent } from "react";

/**
 * Login gate. Client component so the failure state can be reported inline
 * instead of via `alert()`, and so the form still works without JS — it posts
 * to /api/auth/login natively and only upgrades to fetch when hydration runs.
 */
export default function LoginGate() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: fd.get("password") }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      setError(
        res.status === 401
          ? "That password was not accepted."
          : "Login failed. Try again."
      );
    } catch {
      setError("Network error. Check your connection.");
    }
    setPending(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-md">
      <div className="w-full max-w-sm">
        <p className="label-mono mb-md">Diwan Purnama · CV</p>

        <div className="rounded-card border border-rule bg-paper-2 p-lg">
          <h1 className="text-xl">Admin</h1>
          <p className="mt-2xs text-sm text-ink-2">
            Sign in to edit the CV content.
          </p>

          {/* action/method keep the no-JS path working; onSubmit upgrades it
              to fetch once hydrated, so errors can render inline. */}
          <form
            action="/api/auth/login"
            method="POST"
            onSubmit={onSubmit}
            className="mt-lg"
          >
            <label htmlFor="admin-password" className="label-mono mb-2xs block">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              name="password"
              required
              autoComplete="current-password"
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "admin-password-error" : undefined}
              className="field"
              placeholder="••••••••"
            />

            {error && (
              <p
                id="admin-password-error"
                role="alert"
                className="mt-2xs text-sm text-danger"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="btn btn--primary mt-md w-full"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="label-mono mt-md">
          Set <code className="mono normal-case tracking-normal">ADMIN_PASSWORD_HASH</code>{" "}
          in the environment.
        </p>
      </div>
    </div>
  );
}
