import { StaffInvite } from "@/components/admin/staff-invite";
import { PageHeader } from "@/components/admin/rcm/ui";

export default function PeoplePage() {
  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="People"
        lede="Add someone who works here. They receive an email and sign in with a password they choose."
      />
      <StaffInvite empty />
    </main>
  );
}
