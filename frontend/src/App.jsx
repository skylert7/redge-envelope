import { useEffect, useState } from "react";

function getClientHints() {
  return {
    platform: navigator.platform || "",
    language: navigator.language || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    screen: {
      w: window.screen?.width || 0,
      h: window.screen?.height || 0,
    },
  };
}

export default function App() {
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    const track = async () => {
      try {
        setStatus("Sending...");

        const res = await fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientHints: getClientHints(),
            path: window.location.pathname,
            referrer: document.referrer,
          }),
        });

        const data = await res.json();
        setStatus(data.ok ? `Saved ID: ${data.id}` : "Failed");
      } catch (err) {
        console.error(err);
        setStatus("Error");
      }
    };

    track();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Visitor Tracker</h1>
      <p>Status: {status}</p>
    </div>
  );
}
