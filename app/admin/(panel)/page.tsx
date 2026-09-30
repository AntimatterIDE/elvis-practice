import { inviteEditor } from "@/app/admin/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import { readServerEnv } from "@/lib/env";
import { getStaffSession } from "@/lib/supabase/session";

export default async function AdminHomePage() {
  const staff = await getStaffSession();
  const env = readServerEnv();

  return (
    <main>
      <h1 className="font-display text-4xl">Content desk</h1>
      <p className="mt-4 max-w-xl text-muted">
        The public site is reading <strong>{env.CONTENT_SOURCE}</strong> content. Draft clinical pages
        stay off the public indexes until they are offered, approved, and published. Do not store
        patient information here.
      </p>
      <dl className="mt-8 grid gap-4 text-sm md:grid-cols-3">
        <div className="border border-line p-4">
          <dt className="uppercase tracking-[0.14em] text-oxide">Role</dt>
          <dd className="mt-2">{staff?.role}</dd>
        </div>
        <div className="border border-line p-4">
          <dt className="uppercase tracking-[0.14em] text-oxide">Source</dt>
          <dd className="mt-2">{env.CONTENT_SOURCE}</dd>
        </div>
        <div className="border border-line p-4">
          <dt className="uppercase tracking-[0.14em] text-oxide">Indexing</dt>
          <dd className="mt-2">{env.INDEXING_ENABLED === "true" ? "Requested" : "Off"}</dd>
        </div>
      </dl>
      {staff && staff.role !== "editor" ? (
        <section className="mt-12 max-w-lg">
          <h2 className="font-display text-2xl">Invite a user</h2>
          <AdminStateForm action={inviteEditor}>
            <label className="grid gap-2 text-sm">
              Email
              <input name="email" type="email" required className="border border-line bg-card px-3 py-3" />
            </label>
            <label className="grid gap-2 text-sm">
              Name
              <input name="displayName" className="border border-line bg-card px-3 py-3" />
            </label>
            <label className="grid gap-2 text-sm">
              Role
              <select name="role" defaultValue="editor" className="border border-line bg-card px-3 py-3">
                <option value="editor">Editor</option>
                {staff.role === "owner" ? <option value="admin">Admin</option> : null}
                {staff.role === "owner" ? <option value="owner">Owner</option> : null}
              </select>
            </label>
            <button className="justify-self-start bg-oxide px-4 py-2 text-sm text-paper">Create invitation</button>
          </AdminStateForm>
        </section>
      ) : null}
    </main>
  );
}
