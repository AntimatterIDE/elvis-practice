"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import type { Appointment, AppointmentStatus } from "@/lib/rcm/types";
import { visitLabel } from "@/components/admin/rcm/ui";
import { cn } from "@/lib/utils";

const statuses: AppointmentStatus[] = ["scheduled", "arrived", "in_progress", "completed", "cancelled", "no_show"];

export function VisitCardActions({
  visit,
  patientName,
  onStatus,
  onConfirm,
  onRemove,
}: {
  visit: Appointment;
  patientName: string;
  onStatus: (status: AppointmentStatus) => void;
  onConfirm: () => void;
  onRemove: () => void;
}) {
  const showCheckIn = visit.status === "scheduled";
  const showRoom = visit.status === "arrived";
  const showConfirm = visit.confirmation !== "confirmed" && visit.status !== "cancelled";

  return (
    <>
      {showCheckIn ? (
        <button
          type="button"
          className="rounded-md bg-pine px-1.5 py-0.5 text-[0.65rem] font-semibold text-paper shadow-sm hover:bg-oxide-deep"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onStatus("arrived");
          }}
        >
          Check in
        </button>
      ) : null}
      {showRoom ? (
        <button
          type="button"
          className="rounded-md border border-oxide bg-card px-1.5 py-0.5 text-[0.65rem] font-semibold text-oxide hover:bg-mint"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onStatus("in_progress");
          }}
        >
          Room
        </button>
      ) : null}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={`More actions for ${patientName}`}
            className="inline-flex size-6 items-center justify-center rounded-md border border-line bg-card text-sm font-semibold text-ink shadow-sm hover:bg-mist"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            ⋯
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-[11rem] rounded-xl border border-line bg-card p-1 shadow-[0_16px_36px_-20px_rgb(7_30_54_/_0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            {showConfirm ? (
              <DropdownMenu.Item
                className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none hover:bg-mist"
                onSelect={() => onConfirm()}
              >
                Confirm visit
              </DropdownMenu.Item>
            ) : null}
            <DropdownMenu.Label className="px-3 pt-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
              Status
            </DropdownMenu.Label>
            {statuses.map((status) => (
              <DropdownMenu.Item
                key={status}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-1.5 text-sm outline-none hover:bg-mist",
                  visit.status === status && "bg-mint font-medium",
                )}
                onSelect={() => onStatus(status)}
              >
                {visitLabel(status)}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item asChild>
              <Link
                href={`/admin/operations/patients/${visit.patientId}`}
                className="block cursor-pointer rounded-lg px-3 py-2 text-sm outline-none hover:bg-mist"
              >
                Open chart
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="cursor-pointer rounded-lg px-3 py-2 text-sm text-emergency outline-none hover:bg-mist"
              onSelect={() => onRemove()}
            >
              Remove
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
