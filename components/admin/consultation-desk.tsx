import { updateConsultationStatus } from "@/app/admin/consultations/actions";
import { PageHeader, panelClass } from "@/components/admin/rcm/ui";
import { listConsultationRequests, type ConsultationStatus } from "@/lib/consultations/store";

function when(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

const nextStatus: Record<ConsultationStatus, { status: ConsultationStatus; label: string }[]> = {
  new: [
    { status: "reached", label: "Mark reached" },
    { status: "closed", label: "Close" },
  ],
  reached: [
    { status: "new", label: "Mark new" },
    { status: "closed", label: "Close" },
  ],
  closed: [{ status: "new", label: "Reopen" }],
};

export async function ConsultationDesk() {
  let requests: Awaited<ReturnType<typeof listConsultationRequests>> = [];
  let storageError = "";
  try {
    requests = await listConsultationRequests();
  } catch (error) {
    storageError = error instanceof Error ? error.message : "Consultation requests could not be loaded.";
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        kicker="Clinic"
        title="Consultation requests"
        lede="People ask for a call from the contact page. The office reaches out separately. These notes are not a chart and should not contain symptoms."
      />
      {storageError ? (
        <p role="alert" className="text-sm text-emergency">
          {storageError}
        </p>
      ) : null}
      {requests.length === 0 && !storageError ? (
        <p className={`${panelClass} text-sm text-muted`}>No consultation requests yet.</p>
      ) : (
        <ul className="grid gap-4">
          {requests.map((request) => (
            <li key={request.id} className={panelClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-2xl leading-tight">{request.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {when(request.createdAt)} · {request.kind === "consultation" ? "Consultation" : "General question"} · {request.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nextStatus[request.status].map((action) => (
                    <form key={action.status} action={updateConsultationStatus}>
                      <input type="hidden" name="id" value={request.id} />
                      <input type="hidden" name="status" value={action.status} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm font-medium hover:border-oxide"
                      >
                        {action.label}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-muted">Email</dt>
                  <dd className="break-words">{request.email || "—"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted">Phone</dt>
                  <dd>{request.phone || "—"}</dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-muted">Best time for a call</dt>
                  <dd>{request.preferredTime || "—"}</dd>
                </div>
                {request.note ? (
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-muted">Note</dt>
                    <dd className="whitespace-pre-wrap">{request.note}</dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
