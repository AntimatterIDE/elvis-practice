import { emergencyNote } from "@/lib/site";

export function EmergencyNote() {
  return (
    <aside className="border border-emergency/30 bg-card px-5 py-4 text-sm leading-relaxed text-emergency">
      <p className="font-medium">Emergency care</p>
      <p className="mt-1">{emergencyNote}</p>
    </aside>
  );
}
