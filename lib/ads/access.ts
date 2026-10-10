export function explainAdsError(message: string, email: string | null, propertyId: string | null) {
  if (!/sufficient permissions/i.test(message)) return message;
  const who = email || "The service account";
  const property = propertyId || "this property";
  return `${who} signed in, but Google has not given it Viewer access on property ${property}.`;
}
