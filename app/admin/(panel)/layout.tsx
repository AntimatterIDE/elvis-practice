import { redirect } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileBar } from "@/components/admin/admin-mobile-bar";
import { PortalBridge } from "@/components/admin/rcm/portal-bridge";
import { RcmProvider } from "@/components/admin/rcm/store";
import { BrandMark } from "@/components/site/brand";
import { PracticeZeroCredit } from "@/components/site/practice-zero";
import { getStaffSession } from "@/lib/supabase/session";
import { practice } from "@/lib/site";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const staff = await getStaffSession();
  if (!staff) redirect("/admin/login");

  return (
    <div className="min-h-full bg-white lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-neutral-200 bg-neutral-50 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
        <div className="flex h-14 shrink-0 items-center gap-2.5 px-3">
          <BrandMark className="size-8" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-neutral-900">{practice.name}</p>
            <p className="text-xs text-neutral-500">Practice desk</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          <AdminNav />
        </div>
        <div className="shrink-0 space-y-2 bg-neutral-100/70 p-3">
          <p className="truncate text-[13px] font-medium text-neutral-900">{staff.displayName}</p>
          <p className="text-xs text-neutral-500">{staff.role}</p>
          <PracticeZeroCredit tone="light" className="pt-1" />
          {staff.userId === "demo-admin" ? (
            <p className="text-xs leading-relaxed text-neutral-500">
              Patients and scheduled visits are shared with every staff login.
            </p>
          ) : null}
          <form action={signOut}>
            <button className="text-[13px] text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="admin-canvas min-w-0">
        <AdminMobileBar name={staff.displayName} role={staff.role} />
        <RcmProvider>
          <PortalBridge />
          <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </RcmProvider>
      </div>
    </div>
  );
}
