import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { coverFonts } from "@/lib/journal/cover-font";
import { publishedJournalArticle } from "@/lib/journal/store";
import { practice } from "@/lib/site";

const size = { width: 1200, height: 630 };

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const article = await publishedJournalArticle(slug);
  const title = article?.title || practice.name;
  const [fonts, mark] = await Promise.all([
    coverFonts(title).catch(() => []),
    readFile(join(process.cwd(), "public/brand/social-avatar.png")).then((file) => `data:image/png;base64,${file.toString("base64")}`),
  ]);
  const titleSize = title.length > 90 ? 48 : title.length > 60 ? 58 : 72;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "linear-gradient(128deg, #071e36 0%, #0c3d5c 48%, #0e7c78 100%)",
        color: "#f3f7fb",
        padding: "68px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={mark} width={84} height={84} alt="" />
          <div style={{ display: "flex", fontFamily: "Jakarta", fontSize: 28, color: "#9fe3d8" }}>Journal</div>
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Newsreader",
            fontSize: titleSize,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontFamily: "Jakarta", fontSize: 26, color: "#9fe3d8" }}>
          {practice.name} · {practice.physicianName}
        </div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
