"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f8f6f0", color: "#1f2937", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "6rem 1.5rem" }}>
          <p style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0, color: "#0b2a5b" }}>
            The Alignment Clinic
          </p>
          <p style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em", margin: "0.1rem 0 0", color: "#8b6914" }}>
            orthopedic spine surgery
          </p>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 650, marginTop: "1.5rem", letterSpacing: "-0.03em", color: "#0b2a5b" }}>The site hit an error.</h1>
          <p style={{ fontSize: "1.125rem", lineHeight: 1.6, color: "#4a5568" }}>
            Please try again. If you need emergency care, call 911.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: "1.5rem", background: "#1e4fd8", color: "#ffffff", border: 0, borderRadius: 999, padding: "0.8rem 1.1rem", fontWeight: 650 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}