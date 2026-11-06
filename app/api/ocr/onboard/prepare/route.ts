import { prepareOcrInboxUpload } from "@/lib/ocr/inbox";
import { getStaffSession } from "@/lib/supabase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Staff-only: signed upload URL so large PDFs bypass Vercel’s ~4.5MB body limit. */
export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return Response.json({ message: "Sign in as staff to import outside records." }, { status: 401 });
  }
  let body: { fileName?: unknown; contentType?: unknown; byteSize?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: "Send JSON with fileName, contentType, and byteSize." }, { status: 400 });
  }
  const prepared = await prepareOcrInboxUpload({
    staffId: session.userId,
    fileName: typeof body.fileName === "string" ? body.fileName : "import.pdf",
    contentType: typeof body.contentType === "string" ? body.contentType : "application/pdf",
    byteSize: typeof body.byteSize === "number" ? body.byteSize : Number(body.byteSize),
  });
  if (!prepared.ok) {
    return Response.json({ message: prepared.message }, { status: 400 });
  }
  return Response.json({ path: prepared.path, signedUrl: prepared.signedUrl });
}
