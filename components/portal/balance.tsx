import type { ChartFile } from "@/lib/chart-files/types";
import { formatDay, money } from "@/lib/rcm/format";
import type { PortalInvoiceView } from "@/lib/portal/types";

const statusLabel: Record<string, string> = {
  ready: "Ready to bill",
  submitted: "Submitted",
  processing: "Processing",
  accepted: "Accepted",
  denied: "Denied",
  rejected: "Rejected",
  paid: "Paid",
};

export function Charges({ invoices }: { invoices: PortalInvoiceView[] }) {
  return (
    <section className="rounded-3xl border border-line bg-card p-6">
      <h2 className="font-display text-2xl font-medium leading-tight">Charges and invoices</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Amounts the practice has on your record appear here. Paying by card in the portal is not available. Call the practice or pay at the office.
      </p>
      {invoices.length ? (
        <ul className="mt-4 divide-y divide-line">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="grid gap-1 py-3 text-sm">
              <span className="font-semibold">{invoice.description}</span>
              <span className="text-muted">
                {[invoice.date ? formatDay(invoice.date) : "", statusLabel[invoice.status] ?? invoice.status].filter(Boolean).join(" · ")}
              </span>
              <span>
                Charge {money(invoice.charge)}
                {invoice.paid ? ` · Paid ${money(invoice.paid)}` : ""}
                {` · You owe ${money(invoice.owed)}`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm">No charges are on your record.</p>
      )}
    </section>
  );
}

export function LabResults({ files }: { files: ChartFile[] }) {
  return (
    <section className="rounded-3xl border border-line bg-card p-6">
      <h2 className="font-display text-2xl font-medium leading-tight">Lab results</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Results the practice adds to your record appear here. The portal does not pull results from a lab.
      </p>
      {files.length ? (
        <ul className="mt-4 grid gap-3 text-sm">
          {files.map((file) => (
            <li key={file.path} className="flex flex-wrap items-center justify-between gap-3">
              <span>{file.label}</span>
              {file.url ? (
                <a className="font-medium text-oxide-deep underline decoration-oxide-deep/30 underline-offset-4" href={file.url} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm">No lab results are on your record.</p>
      )}
    </section>
  );
}
