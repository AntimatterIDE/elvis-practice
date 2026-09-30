import { emergencyNote } from "@/lib/site";

export function EmergencyNote() {
  return (
    <aside className="rounded-2xl border border-emergency/20 border-l-4 border-l-emergency bg-emergency/5 px-5 py-4 text-sm leading-relaxed text-emergency">
      <p className="font-medium">Emergency care</p>
      <p className="mt-1">{emergencyNote}</p>
    </aside>
  );
}
