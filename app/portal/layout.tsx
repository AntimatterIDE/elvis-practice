import type { Metadata } from "next";
import { ClinicFrame } from "@/components/clinic/frame";
import { practice } from "@/lib/site";

export const metadata: Metadata = {
  title: "Patient portal",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <ClinicFrame kicker={`${practice.physicianName} · Your record`}>{children}</ClinicFrame>;
}
