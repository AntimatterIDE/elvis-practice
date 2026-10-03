import type { Metadata } from "next";
import { ClinicFrame } from "@/components/clinic/frame";
import { unlistedShareMetadata } from "@/lib/share-metadata";
import { practice } from "@/lib/site";

export const metadata: Metadata = {
  ...unlistedShareMetadata,
  title: "Patient portal",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <ClinicFrame kicker={`${practice.physicianName} · Your record`}>{children}</ClinicFrame>;
}
