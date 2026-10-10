const measurementPattern = /^G-[A-Z0-9]+$/;
const campaignPattern = /^\d{6,20}$/;
const propertyPattern = /^\d{6,20}$/;

export function googleMeasurementId(source: NodeJS.ProcessEnv = process.env) {
  const value = (source.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-LN3NRNLSPN").trim();
  return measurementPattern.test(value) ? value : null;
}

export function googleAdsCampaignId(source: NodeJS.ProcessEnv = process.env) {
  const value = (source.GOOGLE_ADS_CAMPAIGN_ID || "24340110437").trim();
  return campaignPattern.test(value) ? value : null;
}

export function ga4PropertyId(source: NodeJS.ProcessEnv = process.env) {
  const value = (source.GA4_PROPERTY_ID || "").trim();
  return propertyPattern.test(value) ? value : null;
}
