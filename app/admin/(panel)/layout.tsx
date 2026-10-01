import { redirect } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { PortalBridge } from "@/components/admin/rcm/portal-bridge";
import { RcmProvider } from "@/components/admin/rcm/store";
import { getStaffSession } from "@/lib/supabase/session";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const staff = await getStaffSession();
  if (!staff) redirect("/admin/login");
  if (process.env.VERCEL_ENV === "production" && staff.userId !== "demo-admin" && staff.aal !== "aal2") {
    redirect("/admin/mfa");
  }

  return (
    <div className="mx-auto grid min-h-full max-w-7xl gap-8 px-5 py-8 md:grid-cols-[16rem_1fr] md:px-8">
      <aside className="border-b border-line pb-6 md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto md:border-b-0 md:border-r md:pr-6">
        <p className="font-display text-2xl">Admin</p>
        <p className="mt-2 text-sm text-muted">
          {staff.displayName}
          <span className="mt-1 block uppercase tracking-[0.14em]">{staff.role}</span>
        </p>
        {staff.userId === "demo-admin" ? (
          <p className="mt-3 text-sm text-oxide">Demo admin. Intake forms and portal logins are saved on this server.</p>
        ) : staff.aal !== "aal2" ? (
          <p className="mt-3 text-sm text-oxide">Development session without multi-factor authentication.</p>
        ) : null}
        <AdminNav />
        <form action={signOut} className="mt-6">
          <button className="text-sm underline underline-offset-4">Sign out</button>
        </form>
      </aside>
      <RcmProvider>
        <PortalBridge />
        <div>{children}</div>
      </RcmProvider>
    </div>
  );
}
