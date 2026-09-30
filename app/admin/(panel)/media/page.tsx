import { saveMedia } from "@/app/admin/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/supabase/session";

export default async function AdminMediaPage() {
  const staff = await getStaffSession();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("media_assets").select("id, storage_path, alt, rights_status").order("updated_at", { ascending: false });

  return (
    <main>
      <h1 className="font-display text-4xl">Media</h1>
      <p className="mt-4 max-w-xl text-muted">
        Record alt text, credit, and rights status. Nothing is public until rights are approved. Do not upload patient images.
      </p>
      {(data ?? []).length === 0 ? <p className="mt-6 text-muted">No media records yet.</p> : null}
      <ul className="mt-6 grid gap-3">
        {(data ?? []).map((asset) => (
          <li key={asset.id} className="border border-line px-4 py-3 text-sm">
            {asset.alt}
            <span className="mt-1 block text-muted">
              {asset.storage_path} · {asset.rights_status}
            </span>
          </li>
        ))}
      </ul>
      <AdminStateForm action={saveMedia}>
        <label className="grid gap-2 text-sm">
          Storage path
          <input name="storagePath" required className="border border-line bg-card px-3 py-3" placeholder="clinic/portrait.jpg" />
        </label>
        <label className="grid gap-2 text-sm">
          Alt text
          <input name="alt" required className="border border-line bg-card px-3 py-3" />
        </label>
        <label className="grid gap-2 text-sm">
          Credit
          <input name="credit" className="border border-line bg-card px-3 py-3" />
        </label>
        {staff?.role === "editor" ? null : (
          <label className="grid gap-2 text-sm">
            Rights
            <select name="rightsStatus" defaultValue="pending" className="border border-line bg-card px-3 py-3">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        )}
        <button className="justify-self-start bg-oxide px-4 py-2 text-sm text-paper">Save metadata</button>
      </AdminStateForm>
    </main>
  );
}
