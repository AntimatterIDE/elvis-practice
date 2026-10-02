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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="44" height="44" viewBox="0 0 32 32">
            <g fill="#9FE3D8">
              <path d="M8 2.2h10v2.2h6.2v4.2h-6.2v2.2H8z" />
              <path d="M6 12.2h12.2v2.4h7v4.6h-7v2.4H6z" />
              <path d="M8 22.2h10.4v2.2h6.4v4.2h-6.4v2.2H8z" />
            </g>
          </svg>
          <div style={{ color: "#9FE3D8", fontSize: 28 }}>The Alignment Clinic</div>
        </div>
        <div style={{ fontSize: 68, lineHeight: 1.08, maxWidth: 860, fontWeight: 560 }}>
          Spine care, carefully aligned.
        </div>
      </div>
    ),
    { ...size },
  );
}
