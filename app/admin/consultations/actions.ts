"use server";

import { revalidatePath } from "next/cache";
import { setConsultationStatus, type ConsultationStatus } from "@/lib/consultations/store";
import { getStaffSession } from "@/lib/supabase/session";

function requestId(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  return /^[0-9a-f-]{36}$/i.test(id) ? id : "";
}

export async function updateConsultationStatus(formData: FormData) {
  const session = await getStaffSession();
  if (!session) return;
  const id = requestId(formData);
  const status = String(formData.get("status") ?? "");
  if (!id || !["new", "reached", "closed"].includes(status)) return;
  await setConsultationStatus(id, status as ConsultationStatus);
  revalidatePath("/admin/operations/consultations");
}
