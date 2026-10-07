import { StaffInvite } from "@/components/admin/staff-invite";
import { PageHeader, panelClass } from "@/components/admin/rcm/ui";
import { Button } from "@/components/ui/button";
import { readServerEnv } from "@/lib/env";
import { getStaffSession } from "@/lib/supabase/session";

export default async function AdminHomePage() {
  const staff = await getStaffSession();
  const env = readServerEnv();

  return (
    <main>
      <PageHeader
        kicker="Website"
        title="Content desk"
        lede={`The public site is reading ${env.CONTENT_SOURCE} content. Draft clinical pages stay off the public indexes until they are offered, approved, and published.`}
        action={
          <Button asChild variant="secondary">
            <a href="/admin/operations">Open the practice desk</a>
          </Button>
        }
      />
      <dl className="mt-8 grid gap-4 text-sm md:grid-cols-3">
        <div className={panelClass}>
          <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Role</dt>
          <dd className="mt-2 font-display text-2xl">{staff?.role}</dd>
        </div>
        <div className={panelClass}>
          <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Source</dt>
          <dd className="mt-2 font-display text-2xl">{env.CONTENT_SOURCE}</dd>
        </div>
        <div className={panelClass}>
          <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Indexing</dt>
          <dd className="mt-2 font-display text-2xl">{env.INDEXING_ENABLED === "true" ? "Requested" : "Off"}</dd>
        </div>
      </dl>
      <StaffInvite defaultRole="editor" />
    </main>
  );
}
