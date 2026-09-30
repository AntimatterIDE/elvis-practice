"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f4efe6", color: "#1c1915", fontFamily: "Georgia, serif" }}>
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "6rem 1.5rem" }}>
          <p style={{ letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 12, color: "#7c2f2a" }}>
            The Alignment Clinic
          </p>
          <h1 style={{ fontSize: "3rem", fontWeight: 450, marginTop: "1rem" }}>The site hit an error.</h1>
          <p style={{ fontSize: "1.125rem", lineHeight: 1.6, color: "#5e584f" }}>
            Please try again. If you need emergency care, call 911.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: "1.5rem", background: "#7c2f2a", color: "#f4efe6", border: 0, padding: "0.8rem 1rem" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
