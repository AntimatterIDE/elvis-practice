import { loadAdsReport } from "@/lib/ads/report";
import { PageHeader, panelClass } from "@/components/admin/rcm/ui";

export async function AdsDesk() {
  const report = await loadAdsReport();
  const focus = report.campaigns.find((row) => row.id === report.campaignId);

  return (
    <main>
      <PageHeader
        kicker="Website"
        title="Ads"
        lede="Visits and conversions from the Google tag on the public site, including the linked Google Ads campaign."
      />
      <dl className="mt-8 grid gap-4 text-sm md:grid-cols-3">
        <div className={panelClass}>
          <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Tag</dt>
          <dd className="mt-2 font-display text-2xl">{report.measurementId}</dd>
        </div>
        <div className={panelClass}>
          <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Campaign</dt>
          <dd className="mt-2 font-display text-2xl">{report.campaignId}</dd>
        </div>
        <div className={panelClass}>
          <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Range</dt>
          <dd className="mt-2 font-display text-2xl">{report.rangeLabel}</dd>
        </div>
      </dl>
      {!report.configured ? (
        <section className={`${panelClass} mt-8 max-w-2xl text-sm leading-relaxed`}>
          <h2 className="font-display text-2xl">Connect Analytics</h2>
          <p className="mt-3 text-muted">
            The tag is already on the public site. Metrics appear here after these Vercel environment variables are set and the service account can view the GA4 property.
          </p>
          <ul className="mt-4 grid gap-2">
            <li><code>GA4_PROPERTY_ID</code> — the numeric property id, not the G- tag.</li>
            <li><code>GA4_SERVICE_ACCOUNT_JSON</code> — the service account key, with Viewer access on that property.</li>
          </ul>
        </section>
      ) : null}
      {report.error ? (
        <section role="alert" className={`${panelClass} mt-8 max-w-2xl text-sm leading-relaxed`}>
          <h2 className="font-display text-2xl">Analytics access</h2>
          <p className="mt-3 text-emergency">{report.error}</p>
          {/Viewer access/i.test(report.error) ? (
            <ol className="mt-4 grid list-decimal gap-2 pl-5 text-muted">
              <li>
                Open{" "}
                <a
                  className="underline underline-offset-4"
                  href={
                    report.propertyId
                      ? `https://analytics.google.com/analytics/web/#/a411547453p${report.propertyId}/admin/property/access-management`
                      : "https://analytics.google.com/analytics/web/#/admin/property/access-management"
                  }
                >
                  Property access management
                </a>
                .
              </li>
              <li>
                Choose Add users and paste {report.accountEmail || "the service account email"}.
              </li>
              <li>Set the role to Viewer, leave the email notice off, and add it.</li>
              <li>Refresh this page.</li>
            </ol>
          ) : null}
        </section>
      ) : null}
      {report.configured && !report.error ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {report.totals.map((item) => (
              <div key={item.label} className={panelClass}>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">{item.label}</p>
                <p className="mt-2 font-display text-3xl">{item.value}</p>
              </div>
            ))}
          </section>
          <section className="mt-10">
            <h2 className="font-display text-2xl">Campaigns</h2>
            {focus ? (
              <p className="mt-2 text-sm text-muted">
                This campaign recorded {focus.sessions} sessions and {focus.conversions} conversions in the last 28 days.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">No sessions are recorded for campaign {report.campaignId} yet.</p>
            )}
            <ul className="mt-4 grid gap-3">
              {report.campaigns.length === 0 ? <li className="text-sm text-muted">No campaign rows yet.</li> : null}
              {report.campaigns.map((row) => (
                <li key={`${row.id}-${row.name}`} className="grid gap-2 rounded-2xl border border-line bg-card px-4 py-3 text-sm md:grid-cols-[1fr_auto_auto_auto]">
                  <span>
                    {row.name}
                    <span className="mt-1 block text-muted">{row.id || "No campaign id"}</span>
                  </span>
                  <span>{row.sessions} sessions</span>
                  <span>{row.users} users</span>
                  <span>{row.conversions} conversions</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}
