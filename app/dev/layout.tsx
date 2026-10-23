import { redirect } from "next/navigation";
import Link from "next/link";
import { getStaffSession } from "@/lib/supabase/session";
import { BrandMark } from "@/components/site/brand";
import { practice } from "@/lib/site";

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffSession();
  if (!staff) redirect("/admin/login?next=/dev/coding-data");

  return (
    <div className="min-h-full bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(159,227,216,0.35),transparent),radial-gradient(900px_500px_at_90%_0%,rgba(185,212,245,0.28),transparent),linear-gradient(180deg,#f3f7fb_0%,#e7f2f8_45%,#f3f7fb_100%)]">
      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark className="size-9" />
            <div>
              <p className="text-[13px] font-semibold tracking-[-0.01em] text-pine">{practice.name}</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-oxide">Dev · partner brief</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/dev/coding-data#least-resistance"
              className="rounded-full border border-oxide/25 bg-mint px-3.5 py-1.5 text-[13px] font-semibold text-oxide-ink transition hover:border-oxide/50"
            >
              Least resistance
            </Link>
            <Link
              href="/dev/coding-data"
              className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-neutral-700 transition hover:bg-white hover:text-ink"
            >
              All sources
            </Link>
            <Link
              href="/dev/spine-eval"
              className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-neutral-700 transition hover:bg-white hover:text-ink"
            >
              Live eval
            </Link>
            <Link
              href="/admin/operations"
              className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-neutral-600 transition hover:bg-white hover:text-ink"
            >
              Practice desk
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">{children}</div>
    </div>
  );
}
