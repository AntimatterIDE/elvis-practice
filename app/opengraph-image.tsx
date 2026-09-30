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
          background: "#071E36",
          color: "#F3F7FB",
          padding: "72px",
        }}
      >
        <div style={{ color: "#9FE3D8", fontSize: 22, letterSpacing: 3, fontWeight: 650 }}>THE ALIGNMENT CLINIC</div>
        <div style={{ fontSize: 72, lineHeight: 1.05, maxWidth: 860, fontWeight: 650 }}>Spine care, carefully aligned.</div>
      </div>
    ),
    { ...size },
  );
}
