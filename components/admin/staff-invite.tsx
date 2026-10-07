import { inviteEditor } from "@/app/admin/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import { Field, fieldClass, panelClass } from "@/components/admin/rcm/ui";
import { Button } from "@/components/ui/button";
import { getStaffSession } from "@/lib/supabase/session";

export async function StaffInvite({
  defaultRole = "admin",
  empty = false,
}: {
  defaultRole?: "editor" | "admin" | "owner";
  empty?: boolean;
}) {
  const staff = await getStaffSession();
  const canInvite = staff?.role === "owner" || staff?.role === "admin";
  if (!canInvite) {
    if (!empty) return null;
    return <p className="mt-8 text-sm text-muted">Only an owner or an admin can add someone.</p>;
  }

  const role = staff.role === "admin" ? "editor" : defaultRole;

  return (
    <section id="people" className={`${panelClass} mt-8 max-w-lg`}>
      <h2 className="font-display text-2xl">Send an invitation</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">Enter their email. They get a link and choose their own password.</p>
      <AdminStateForm action={inviteEditor}>
        <Field label="Email">
          <input name="email" type="email" required autoComplete="off" className={fieldClass} />
        </Field>
        <Field label="Name">
          <input name="displayName" autoComplete="name" className={fieldClass} />
        </Field>
        <Field label="Role">
          <select name="role" defaultValue={role} className={fieldClass}>
            <option value="editor">Editor</option>
            {staff.role === "owner" ? <option value="admin">Admin</option> : null}
            {staff.role === "owner" ? <option value="owner">Owner</option> : null}
          </select>
        </Field>
        <p className="text-sm leading-relaxed text-muted">
          Editors draft the website. Admins can publish and invite editors. Owners can invite anyone.
        </p>
        <Button className="justify-self-start">Send invitation</Button>
      </AdminStateForm>
    </section>
  );
}
