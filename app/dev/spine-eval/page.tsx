import type { Metadata } from "next";
import { SpineEvalDesk } from "@/components/dev/spine-eval-desk";

export const metadata: Metadata = {
  title: "Spine coding live eval · Dev",
  robots: { index: false, follow: false },
};

export default function SpineEvalPage() {
  return <SpineEvalDesk />;
}
