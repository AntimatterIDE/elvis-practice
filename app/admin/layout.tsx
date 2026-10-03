import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { unlistedShareMetadata } from "@/lib/share-metadata";
import { isAdminHostAllowed } from "@/lib/site";

export const metadata: Metadata = unlistedShareMetadata;

export default async function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  const host = (await headers()).get("host");
  if (!isAdminHostAllowed(host)) notFound();
  return <div className="min-h-full bg-paper text-ink">{children}</div>;
}
