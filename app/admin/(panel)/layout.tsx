import { redirect } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { PortalBridge } from "@/components/admin/rcm/portal-bridge";
import { RcmProvider } from "@/components/admin/rcm/store";
import { BrandMark } from "@/components/site/brand";
import { getStaffSession } from "@/lib/supabase/session";
import { practice } from "@/lib/site";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const staff = await getStaffSession();
  if (!staff) redirect("/admin/login");

  return (
    <div className="min-h-full md:grid md:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="bg-pine text-paper md:sticky md:top-0 md:flex md:h-screen md:flex-col md:overflow-y-auto">
        <div className="flex items-center gap-3 px-4 py-5">
          <BrandMark tone="reverse" className="size-11" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg leading-tight">{practice.name}</p>
            <p className="text-xs text-foam/70">Practice desk</p>
          </div>
        </div>
        <div className="px-3 pb-4 md:flex-1">
          <AdminNav />
        </div>
        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-sm font-semibold">{staff.displayName}</p>
          <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-foam/70">{staff.role}</p>
          {staff.userId === "demo-admin" ? (
            <p className="mt-3 text-xs leading-relaxed text-paper/60">
              Demo desk. Intake and portal logins are saved on the server. Other charts stay in this browser until a patient login is created.
            </p>
          ) : null}
          <form action={signOut} className="mt-4">
            <button className="text-sm text-paper/70 underline decoration-white/30 underline-offset-4 hover:text-paper">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="admin-canvas min-w-0">
        <RcmProvider>
          <PortalBridge />
          <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">{children}</div>
        </RcmProvider>
      </div>
    </div>
  );
}
