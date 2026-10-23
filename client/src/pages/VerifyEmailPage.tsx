import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, isApiError } from "../lib/api";

type VerificationState =
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string };

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [verification, setVerification] = useState<VerificationState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;
    if (!token) {
      setVerification({
        status: "error",
        message: "This verification link is missing its token.",
      });
      return () => {
        active = false;
      };
    }

    void api.verifyEmail(token).then(
      () => {
        if (active) setVerification({ status: "success" });
      },
      (error: unknown) => {
        if (!active) return;
        const message =
          isApiError(error) &&
          (error.code === "INVALID_TOKEN" || error.code === "TOKEN_EXPIRED")
            ? "This verification link is invalid or has expired. Request a fresh link to continue."
            : isApiError(error)
              ? error.message
              : "We could not verify this email. Please try again.";
        setVerification({ status: "error", message });
      },
    );

    return () => {
      active = false;
    };
  }, [token]);

  if (verification.status === "loading") {
    return (
      <section className="auth-card" aria-live="polite">
        <p className="eyebrow">VERIFYING EMAIL</p>
        <h1>Confirming your address…</h1>
      </section>
    );
  }

  if (verification.status === "success") {
    return (
      <section className="auth-card" aria-live="polite">
        <p className="eyebrow">EMAIL CONFIRMED</p>
        <h1>Your log is ready.</h1>
        <p className="auth-description">Sign in to get started.</p>
        <Link className="button button-primary button-full" to="/login">
          Continue to sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">LINK UNAVAILABLE</p>
      <h1>We could not confirm this address.</h1>
      <p className="form-error" role="alert">{verification.message}</p>
      <Link className="button button-secondary button-full" to="/login">
        Return to sign in
      </Link>
    </section>
  );
}
