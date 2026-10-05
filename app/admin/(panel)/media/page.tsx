import { saveMedia } from "@/app/admin/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import { Field, PageHeader, fieldClass, panelClass } from "@/components/admin/rcm/ui";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/supabase/session";

export default async function AdminMediaPage() {
  const staff = await getStaffSession();
  const data = isSupabaseConfigured()
    ? (
        await (await createSupabaseServerClient())
          .from("media_assets")
          .select("id, storage_path, alt, rights_status")
          .order("updated_at", { ascending: false })
      ).data
    : [];

  return (
    <main>
      <PageHeader
        kicker="Website"
        title="Media"
        lede="Record alt text, credit, and rights status. Nothing is public until rights are approved. Do not upload patient images."
      />
      {(data ?? []).length === 0 ? <p className="mt-6 text-sm text-muted">No media records yet.</p> : null}
      <ul className="mt-6 grid gap-3">
        {(data ?? []).map((asset) => (
          <li key={asset.id} className={panelClass}>
            <p className="font-medium">{asset.alt}</p>
            <p className="mt-1 text-sm text-muted">
              {asset.storage_path} · {asset.rights_status}
            </p>
          </li>
        ))}
      </ul>
      <section className={`${panelClass} mt-8 max-w-xl`}>
        <h2 className="font-display text-2xl">New record</h2>
        <AdminStateForm action={saveMedia}>
          <Field label="Storage path">
            <input name="storagePath" required className={fieldClass} placeholder="clinic/portrait.jpg" />
          </Field>
          <Field label="Alt text">
            <input name="alt" required className={fieldClass} />
          </Field>
          <Field label="Credit">
            <input name="credit" className={fieldClass} />
          </Field>
          {staff?.role === "editor" ? null : (
            <Field label="Rights">
              <select name="rightsStatus" defaultValue="pending" className={fieldClass}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
          )}
          <Button className="justify-self-start">Save metadata</Button>
        </AdminStateForm>
      </section>
    </main>
  );
}
