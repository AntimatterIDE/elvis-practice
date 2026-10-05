import { saveSettings } from "@/app/admin/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import { Field, PageHeader, fieldClass, panelClass } from "@/components/admin/rcm/ui";
import { Button } from "@/components/ui/button";
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
      <PageHeader
        kicker="Website"
        title="Settings"
        lede="Phone, address, hours, and booking stay empty until you enter confirmed facts. Only an owner can save this form. Do not put medical records here."
      />
      {staff?.role !== "owner" ? (
        <p className="mt-6 text-sm text-oxide">You can read settings. You cannot change them.</p>
      ) : (
        <section className={`${panelClass} mt-8 max-w-xl`}>
          <AdminStateForm action={saveSettings}>
            <Field label="Phone">
              <input name="phone" defaultValue={data?.phone ?? ""} className={fieldClass} />
            </Field>
            <Field label="Address">
              <textarea name="address" defaultValue={data?.address ?? ""} className={`${fieldClass} min-h-24`} />
            </Field>
            <Field label="Hours">
              <textarea name="hours" defaultValue={data?.hours ?? ""} className={`${fieldClass} min-h-24`} />
            </Field>
            <Field label="Booking URL">
              <input name="bookingUrl" defaultValue={data?.booking_url ?? ""} className={fieldClass} />
            </Field>
            <Field label="Announcement">
              <textarea name="announcement" defaultValue={data?.announcement ?? ""} className={`${fieldClass} min-h-20`} />
            </Field>
            <Button className="justify-self-start">Save settings</Button>
          </AdminStateForm>
        </section>
      )}
    </main>
  );
}
