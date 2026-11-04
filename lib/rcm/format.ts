import type { Claim, Patient } from "@/lib/rcm/types";

export function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function patientName(patient: Pick<Patient, "firstName" | "lastName">) {
  return `${patient.firstName} ${patient.lastName}`.trim();
}

export function claimTotal(claim: Pick<Claim, "lines">) {
  return claim.lines.reduce((sum, line) => sum + (line.includeOnBill === false ? 0 : line.charge * line.units), 0);
}

export function formatDay(value: string) {
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function clinicClock(value: string) {
  const match = /T(\d{2}):(\d{2})/.exec(value);
  if (!match) return "";
  const hour = Number(match[1]);
  if (hour > 23) return "";
  const minute = match[2];
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
}

export function formatWhen(value: string) {
  const clock = clinicClock(value);
  if (clock) {
    const day = new Date(`${value.slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(day.getTime())) {
      return `${day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${clock}`;
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(value: string) {
  const clock = clinicClock(value);
  if (clock) return clock;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatClinicDay(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}
