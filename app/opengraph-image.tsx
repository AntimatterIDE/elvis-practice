import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F4EFE6",
          color: "#1C1915",
          padding: "72px",
        }}
      >
        <div style={{ color: "#7C2F2A", fontSize: 22, letterSpacing: 4 }}>THE ALIGNMENT CLINIC</div>
        <div style={{ fontSize: 76, lineHeight: 1, maxWidth: 860 }}>Spine care, carefully aligned.</div>
      </div>
    ),
    { ...size },
  );
}
