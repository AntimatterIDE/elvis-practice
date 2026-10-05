import { PageHeader, panelClass } from "@/components/admin/rcm/ui";
import { treatments } from "@/lib/content/treatments";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminTreatmentsPage() {
  const loaded = isSupabaseConfigured()
    ? await (await createSupabaseServerClient())
        .from("treatments")
        .select("slug, title, review_status, offering_status, published_at")
        .order("title")
    : { data: [], error: null };
  const { data, error } = loaded;
  const rows = data ?? [];
  const missing = treatments.filter((document) => !rows.some((row) => row.slug === document.slug));

  return (
    <main>
      <PageHeader kicker="Website" title="Treatments" lede="Open a page to edit the public copy. File drafts can be saved from each editor." />
      {error ? <p className="mt-4 text-emergency">Could not load database rows.</p> : null}
      <ul className="mt-8 grid gap-3">
        {rows.map((row) => (
          <li key={row.slug}>
            <a className={`${panelClass} flex items-center justify-between gap-4 transition hover:border-oxide/40`} href={`/admin/treatments/${row.slug}`}>
              <span className="font-medium">{row.title}</span>
              <span className="text-sm text-muted">
                {row.published_at ? "Published" : row.review_status} · {row.offering_status}
              </span>
            </a>
          </li>
        ))}
        {missing.map((document) => (
          <li key={document.slug}>
            <a className={`${panelClass} flex items-center justify-between gap-4 transition hover:border-oxide/40`} href={`/admin/treatments/${document.slug}`}>
              <span className="font-medium">{document.title}</span>
              <span className="text-sm text-oxide">File draft</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
