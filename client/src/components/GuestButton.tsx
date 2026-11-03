import { useState } from "react";
import { api, isApiError } from "../lib/api";

export default function GuestButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function enterAsGuest() {
    setError("");
    setLoading(true);
    try {
      await api.guestLogin();
      window.location.assign("/dashboard");
    } catch (requestError) {
      setError(
        isApiError(requestError)
          ? requestError.message
          : "We could not start the demo. Please try again.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="guest-entry">
      <button
        type="button"
        onClick={enterAsGuest}
        disabled={loading}
        className="button button-secondary guest-entry-button"
      >
        {loading ? "Starting the demo…" : "Explore the demo"}
      </button>
      {loading && (
        <p className="guest-entry-copy" role="status">
          The server may take up to a minute to wake.
        </p>
      )}
      {error && (
        <p className="guest-entry-error" role="alert">{error}</p>
      )}
    </div>
  );
}