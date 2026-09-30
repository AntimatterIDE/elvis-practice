import { conditions } from "@/lib/content/conditions";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminConditionsPage() {
  const loaded = isSupabaseConfigured()
    ? await (await createSupabaseServerClient())
        .from("conditions")
        .select("slug, title, review_status, offering_status, published_at")
        .order("title")
    : { data: [], error: null };
  const { data, error } = loaded;
  const rows = data ?? [];
  const missing = conditions.filter((document) => !rows.some((row) => row.slug === document.slug));

  return (
    <main>
      <h1 className="font-display text-4xl">Conditions</h1>
      {error ? <p className="mt-4 text-emergency">Could not load database rows.</p> : null}
      {rows.length === 0 ? (
        <p className="mt-6 text-muted">No database rows yet. Open a file draft to save it into Supabase.</p>
      ) : null}
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {rows.map((row) => (
          <li key={row.slug}>
            <a className="flex items-baseline justify-between gap-4 py-4" href={`/admin/conditions/${row.slug}`}>
              <span>{row.title}</span>
              <span className="text-sm text-muted">
                {row.published_at ? "Published" : row.review_status} · {row.offering_status}
              </span>
            </a>
          </li>
        ))}
        {missing.map((document) => (
          <li key={document.slug}>
            <a className="flex items-baseline justify-between gap-4 py-4" href={`/admin/conditions/${document.slug}`}>
              <span>{document.title}</span>
              <span className="text-sm text-oxide">File draft</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
