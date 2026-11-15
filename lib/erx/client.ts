/**
 * Client-safe helpers (no server-only). Used by PrescribeDesk for schedule gates
 * and display labels without pulling the adapter into the browser bundle.
 */

export function isControlledSchedule(schedule: string) {
  return schedule === "II" || schedule === "III" || schedule === "IV" || schedule === "V";
}

export function scheduleLabel(schedule: string) {
  if (schedule === "non_controlled") return "Non-controlled";
  if (schedule === "II" || schedule === "III" || schedule === "IV" || schedule === "V") {
    return `Schedule ${schedule}`;
  }
  return schedule;
}
