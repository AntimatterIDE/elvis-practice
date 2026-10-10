import "server-only";
import { createSign } from "node:crypto";
import { ga4PropertyId, googleAdsCampaignId, googleMeasurementId } from "@/lib/ads/config";

export type AdsMetric = {
  label: string;
  value: string;
};

export type AdsCampaignRow = {
  name: string;
  id: string;
  sessions: string;
  users: string;
  conversions: string;
};

export type AdsReport = {
  measurementId: string | null;
  propertyId: string | null;
  campaignId: string | null;
  configured: boolean;
  error?: string;
  rangeLabel: string;
  totals: AdsMetric[];
  campaigns: AdsCampaignRow[];
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    return null;
  }
}

async function accessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const assertion = `${header}.${claim}.${signer.sign(account.private_key).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || "Google Analytics did not accept the service account.");
  }
  return body.access_token;
}

type ReportResponse = {
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
  error?: { message?: string };
};

async function runReport(propertyId: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as ReportResponse;
  if (!response.ok) throw new Error(payload.error?.message || "Google Analytics did not return campaign metrics.");
  return payload.rows ?? [];
}

function metric(rows: ReportResponse["rows"], index: number) {
  return rows?.[0]?.metricValues?.[index]?.value || "0";
}

export async function loadAdsReport(): Promise<AdsReport> {
  const measurementId = googleMeasurementId();
  const propertyId = ga4PropertyId();
  const campaignId = googleAdsCampaignId();
  const account = serviceAccount();
  const base = {
    measurementId,
    propertyId,
    campaignId,
    rangeLabel: "Last 28 days",
    totals: [] as AdsMetric[],
    campaigns: [] as AdsCampaignRow[],
  };
  if (process.env.GA4_SERVICE_ACCOUNT_JSON?.trim() && !account) {
    return { ...base, configured: true, error: "GA4_SERVICE_ACCOUNT_JSON is not a service account key." };
  }
  if (!propertyId || !account) {
    return { ...base, configured: false };
  }

  try {
    const token = await accessToken(account);
    const dateRanges = [{ startDate: "28daysAgo", endDate: "yesterday" }];
    const metrics = [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }, { name: "engagedSessions" }];
    const totals = await runReport(propertyId, token, { dateRanges, metrics });
    const campaigns = await runReport(propertyId, token, {
      dateRanges,
      metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }],
      dimensions: [{ name: "sessionGoogleAdsCampaignName" }, { name: "sessionGoogleAdsCampaignId" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 12,
    });
    return {
      ...base,
      configured: true,
      totals: [
        { label: "Sessions", value: metric(totals, 0) },
        { label: "Users", value: metric(totals, 1) },
        { label: "Conversions", value: metric(totals, 2) },
        { label: "Engaged sessions", value: metric(totals, 3) },
      ],
      campaigns: campaigns.map((row) => ({
        name: row.dimensionValues?.[0]?.value || "Unnamed campaign",
        id: row.dimensionValues?.[1]?.value || "",
        sessions: row.metricValues?.[0]?.value || "0",
        users: row.metricValues?.[1]?.value || "0",
        conversions: row.metricValues?.[2]?.value || "0",
      })),
    };
  } catch (error) {
    return {
      ...base,
      configured: true,
      error: error instanceof Error ? error.message : "Campaign metrics could not be loaded.",
    };
  }
}
