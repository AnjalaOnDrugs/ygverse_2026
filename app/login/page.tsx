"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();
  const [regNo, setRegNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await login(regNo, password);
      if (!result.success) {
        setError(result.message ?? "Invalid credentials");
      }
      // On success the AuthProvider route guard redirects to /photos
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="rise-in w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-display mb-3 text-xs tracking-[0.4em] text-teal">
            2026
          </p>
          <h1 className="neon-logo text-4xl font-bold">YGVERSE</h1>
          <p className="mt-4 text-sm text-muted">
            Log in with your registration number
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="input-dark"
            type="text"
            placeholder="Registration number"
            value={regNo}
            onChange={(e) => setRegNo(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
          <input
            className="input-dark"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="submit"
            className="btn-neon mt-2 flex cursor-pointer items-center justify-center gap-2"
            disabled={submitting}
          >
            {submitting ? <span className="spinner" /> : "Enter the verse"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-center text-sm text-hot" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
