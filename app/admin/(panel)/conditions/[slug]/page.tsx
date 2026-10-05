import { notFound } from "next/navigation";
import { ClinicalEditor } from "@/components/admin/clinical-editor";
import { PageHeader } from "@/components/admin/rcm/ui";
import { getCondition } from "@/lib/content";
import { isSupabaseConfigured } from "@/lib/env";
import { clinicalRowToDocument } from "@/lib/supabase/map-clinical";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/supabase/session";

export default async function EditConditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staff = await getStaffSession();
  if (!staff) notFound();
  const data = isSupabaseConfigured()
    ? (await (await createSupabaseServerClient()).from("conditions").select("*").eq("slug", slug).maybeSingle()).data
    : null;
  const document = data ? clinicalRowToDocument(data, "condition") : getCondition(slug);
  if (!document) notFound();

  return (
    <main>
      <PageHeader
        kicker="Condition draft"
        title={document.title}
        lede="Search listing and page sections stay closed until you open them. Markdown is limited to paragraphs, lists, and emphasis."
        action={
          <a className="text-sm font-semibold underline underline-offset-4" href={`/preview/conditions/${document.slug}`}>
            Preview
          </a>
        }
      />
      <ClinicalEditor document={document} role={staff.role} />
    </main>
  );
}
