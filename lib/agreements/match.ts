export function personName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function unassignedReason(
  packet: { recipientEmail: string; recipientName: string },
  chart: { email: string; name: string },
): "email" | "name" | null {
  const email = chart.email.trim().toLowerCase();
  if (email && packet.recipientEmail.trim().toLowerCase() === email) return "email";
  const name = personName(chart.name);
  const recipient = personName(packet.recipientName);
  if (name.length > 2 && recipient === name) return "name";
  return null;
}
