import { notFound } from "next/navigation";
import { ClinicalEditor } from "@/components/admin/clinical-editor";
import { getCondition } from "@/lib/content";
import { clinicalRowToDocument } from "@/lib/supabase/map-clinical";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/supabase/session";

export default async function EditConditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staff = await getStaffSession();
  if (!staff) notFound();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("conditions").select("*").eq("slug", slug).maybeSingle();
  const document = data ? clinicalRowToDocument(data, "condition") : getCondition(slug);
  if (!document) notFound();

  return (
    <main>
      <p className="text-xs uppercase tracking-[0.18em] text-oxide">Condition draft</p>
      <h1 className="mt-3 font-display text-4xl">{document.title}</h1>
      <p className="mt-3 text-sm text-muted">
        Public preview, not indexed: <a href={`/preview/conditions/${document.slug}`}>/preview/conditions/{document.slug}</a>
      </p>
      <ClinicalEditor document={document} role={staff.role} />
    </main>
  );
}
