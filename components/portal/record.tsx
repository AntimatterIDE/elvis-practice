import type { PatientPortalView } from "@/lib/portal/types";

export function RecordCard({ home }: { home: PatientPortalView }) {
  return (
    <>
      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-medium leading-tight">On your chart</h2>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <Info label="Legal name" value={`${home.firstName} ${home.lastName}`.trim()} />
          <Info label="Preferred name" value={home.preferredName} />
          <Info label="Date of birth" value={home.dateOfBirth} />
          <Info label="Phone" value={home.phone} />
          <Info label="Email" value={home.email} />
          <Info label="Address" value={home.addressLine} />
          <Info label="Medical record number" value={home.mrn} />
          <Info label="Insurance" value={[home.payerName, home.memberId].filter(Boolean).join(" · ")} />
          <Info label="Emergency contact" value={home.emergency} />
          <Info label="Pharmacy" value={home.pharmacy} />
        </dl>
      </section>

      {home.allergies.length || home.medications.length ? (
        <section className="rounded-3xl border border-line bg-card p-6">
          <h2 className="font-display text-2xl font-medium leading-tight">Allergies and medicines</h2>
          <p className="mt-2 text-sm text-muted">Tell the practice if this list is missing something.</p>
          {home.allergies.length ? (
            <p className="mt-4 text-sm">
              <span className="font-semibold">Allergies. </span>
              {home.allergies.join(" · ")}
            </p>
          ) : null}
          {home.medications.length ? (
            <p className="mt-2 text-sm">
              <span className="font-semibold">Medicines. </span>
              {home.medications.join(" · ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {home.answers.length ? (
        <section className="rounded-3xl border border-line bg-card p-6">
          <h2 className="font-display text-2xl font-medium leading-tight">What you sent</h2>
          <dl className="mt-4 grid gap-4">
            {home.answers.map((answer) => (
              <div key={answer.label}>
                <dt className="kicker text-muted">{answer.label}</dt>
                <dd className="mt-1 text-sm leading-relaxed">{answer.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="kicker text-muted">{label}</dt>
      <dd className="mt-1 leading-relaxed">{value}</dd>
    </div>
  );
}
