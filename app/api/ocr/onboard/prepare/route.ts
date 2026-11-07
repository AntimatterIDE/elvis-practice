import { resolveOcrActor } from "@/lib/ocr/auth";
import { prepareOcrInboxUpload } from "@/lib/ocr/inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Staff, intake invite, or portal patient: signed upload URL for large PDFs. */
export async function POST(request: Request) {
  const actor = await resolveOcrActor(request);
  if (!actor) {
    return Response.json({ message: "Sign in or open a valid intake link to import records." }, { status: 401 });
  }
  let body: { fileName?: unknown; contentType?: unknown; byteSize?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: "Send JSON with fileName, contentType, and byteSize." }, { status: 400 });
  }
  const prepared = await prepareOcrInboxUpload({
    staffId: actor.actorId,
    fileName: typeof body.fileName === "string" ? body.fileName : "import.pdf",
    contentType: typeof body.contentType === "string" ? body.contentType : "application/pdf",
    byteSize: typeof body.byteSize === "number" ? body.byteSize : Number(body.byteSize),
  });
  if (!prepared.ok) {
    return Response.json({ message: prepared.message }, { status: 400 });
  }
  return Response.json({ path: prepared.path, signedUrl: prepared.signedUrl });
}
