import type { Metadata } from "next";
import { CodingDataDesk } from "@/components/dev/coding-data-desk";

export const metadata: Metadata = {
  title: "Coding data sources · Dev",
  robots: { index: false, follow: false },
};

export default function CodingDataDevPage() {
  return <CodingDataDesk />;
}
