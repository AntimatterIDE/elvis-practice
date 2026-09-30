import { saveSettings } from "@/app/admin/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/supabase/session";

export default async function AdminSettingsPage() {
  const staff = await getStaffSession();
  const data = isSupabaseConfigured()
    ? (
        await (await createSupabaseServerClient())
          .from("site_settings")
          .select("phone, address, hours, booking_url, announcement")
          .eq("id", 1)
          .maybeSingle()
      ).data
    : null;

  return (
    <main>
      <h1 className="font-display text-4xl">Settings</h1>
      <p className="mt-4 max-w-xl text-muted">
        Phone, address, hours, and booking stay empty until you enter confirmed facts. Only an owner can save this form. Do not put medical records here.
      </p>
      {staff?.role !== "owner" ? (
        <p className="mt-6 text-sm text-oxide">You can read settings. You cannot change them.</p>
      ) : (
        <AdminStateForm action={saveSettings}>
          <label className="grid gap-2 text-sm">
            Phone
            <input name="phone" defaultValue={data?.phone ?? ""} className="border border-line bg-card px-3 py-3" />
          </label>
          <label className="grid gap-2 text-sm">
            Address
            <textarea name="address" defaultValue={data?.address ?? ""} className="min-h-24 border border-line bg-card px-3 py-3" />
          </label>
          <label className="grid gap-2 text-sm">
            Hours
            <textarea name="hours" defaultValue={data?.hours ?? ""} className="min-h-24 border border-line bg-card px-3 py-3" />
          </label>
          <label className="grid gap-2 text-sm">
            Booking URL
            <input name="bookingUrl" defaultValue={data?.booking_url ?? ""} className="border border-line bg-card px-3 py-3" />
          </label>
          <label className="grid gap-2 text-sm">
            Announcement
            <textarea name="announcement" defaultValue={data?.announcement ?? ""} className="min-h-20 border border-line bg-card px-3 py-3" />
          </label>
          <button className="justify-self-start bg-oxide px-4 py-2 text-sm text-paper">Save settings</button>
        </AdminStateForm>
      )}
    </main>
  );
}
