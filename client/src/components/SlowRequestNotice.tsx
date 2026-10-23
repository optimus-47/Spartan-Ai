import { useEffect, useState } from "react";
import {
  isSlowRequestEvent,
  slowRequestEventName,
} from "../lib/api";

export function SlowRequestNotice() {
  const [activeRequests, setActiveRequests] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const handleSlowRequest = (event: Event) => {
      if (!isSlowRequestEvent(event)) return;
      const { requestId, active } = event.detail;
      setActiveRequests((current) => {
        const next = new Set(current);
        if (active) next.add(requestId);
        else next.delete(requestId);
        return next;
      });
    };
    window.addEventListener(slowRequestEventName, handleSlowRequest);
    return () =>
      window.removeEventListener(slowRequestEventName, handleSlowRequest);
  }, []);

  if (activeRequests.size === 0) return null;
  return (
    <div aria-live="polite" className="server-notice" role="status">
      Waking the server, this can take up to a minute
    </div>
  );
}
