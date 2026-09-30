import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/supabase/session";

export default async function AuditPage() {
  const staff = await getStaffSession();
  if (staff?.role === "editor") {
    return (
      <main>
        <h1 className="font-display text-4xl">Audit</h1>
        <p className="mt-4 text-muted">Editors do not have access to the audit log.</p>
      </main>
    );
  }

  const loaded = isSupabaseConfigured()
    ? await (await createSupabaseServerClient())
        .from("audit_log")
        .select("id, action, entity_table, entity_id, summary, created_at")
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [], error: null };
  const { data, error } = loaded;

  return (
    <main>
      <h1 className="font-display text-4xl">Audit</h1>
      {error ? <p className="mt-4 text-emergency">Could not load the audit log.</p> : null}
      {(data ?? []).length === 0 ? <p className="mt-6 text-muted">No recorded changes yet.</p> : null}
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {(data ?? []).map((entry) => (
          <li key={entry.id} className="py-4 text-sm">
            <p>{entry.summary}</p>
            <p className="mt-1 text-muted">
              {entry.action} · {entry.entity_table} · {entry.entity_id} · {new Date(entry.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
