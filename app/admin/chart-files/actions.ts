"use server";

import { listChartFiles, prepareChartUpload, removeChartFile } from "@/lib/chart-files/store";
import { getStaffSession } from "@/lib/supabase/session";

async function gate() {
  return Boolean(await getStaffSession());
}

export async function chartFiles(patientId: string) {
  if (!(await gate())) return { ok: false as const, message: "Sign in as staff before opening chart files." };
  return listChartFiles(patientId);
}

export async function beginChartUpload(input: { patientId: string; slotId: string; contentType: string; byteSize: number }) {
  if (!(await gate())) return { ok: false as const, message: "Sign in as staff before storing a file." };
  return prepareChartUpload(input);
}

export async function deleteChartFile(patientId: string, path: string) {
  if (!(await gate())) return { ok: false as const, message: "Sign in as staff before removing a file." };
  return removeChartFile(patientId, path);
}
