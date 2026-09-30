import { redirect } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { getStaffSession } from "@/lib/supabase/session";

const links = [
  ["/admin", "Overview"],
  ["/admin/conditions", "Conditions"],
  ["/admin/treatments", "Treatments"],
  ["/admin/faqs", "Questions"],
  ["/admin/media", "Media"],
  ["/admin/settings", "Settings"],
  ["/admin/audit", "Audit"],
] as const;

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login");
  }
  const staff = await getStaffSession();
  if (!staff) redirect("/admin/login");
  if (process.env.VERCEL_ENV === "production" && staff.aal !== "aal2") redirect("/admin/mfa");

  return (
    <div className="mx-auto grid min-h-full max-w-6xl gap-8 px-5 py-8 md:grid-cols-[14rem_1fr] md:px-8">
      <aside className="border-b border-line pb-6 md:border-b-0 md:border-r md:pr-6">
        <p className="font-display text-2xl">Admin</p>
        <p className="mt-2 text-sm text-muted">
          {staff.displayName}
          <span className="mt-1 block uppercase tracking-[0.14em]">{staff.role}</span>
        </p>
        {staff.aal !== "aal2" ? (
          <p className="mt-3 text-sm text-oxide">Development session without multi-factor authentication.</p>
        ) : null}
        <nav aria-label="Admin" className="mt-6 grid gap-2 text-sm">
          {links.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <form action={signOut} className="mt-6">
          <button className="text-sm underline underline-offset-4">Sign out</button>
        </form>
      </aside>
      <div>{children}</div>
    </div>
  );
}
