import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/supabase/session";

export default async function MfaPage() {
  const staff = await getStaffSession();
  if (!staff) redirect("/admin/login");
  redirect("/admin");
}
