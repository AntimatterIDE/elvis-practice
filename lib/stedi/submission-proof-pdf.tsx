import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { practice, practiceName } from "@/lib/site";
import type { SubmissionProofReport } from "@/lib/stedi/submission-proof";

const colors = {
  ink: "#0b1f33",
  muted: "#4a6074",
  line: "#d3e0ea",
  oxide: "#0e8f84",
  oxideDeep: "#0a6e66",
  clinicBlue: "#0b3d78",
  mist: "#e7f2f8",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.ink,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 48,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: colors.oxide,
    paddingBottom: 14,
    marginBottom: 16,
  },
  logo: { width: 148, height: 42, objectFit: "contain" },
  headerMeta: { alignItems: "flex-end", maxWidth: 220 },
  practiceLine: { fontSize: 8, color: colors.clinicBlue, textAlign: "right", lineHeight: 1.35 },
  contactLine: { marginTop: 4, fontSize: 8, color: colors.muted, textAlign: "right", lineHeight: 1.35 },
  kicker: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.clinicBlue,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: colors.clinicBlue, marginBottom: 4 },
  subtitle: { fontSize: 9, color: colors.muted, marginBottom: 14, lineHeight: 1.4 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.mist,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginBottom: 16,
  },
  metaItem: {
    width: "50%",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  metaLabel: {
    fontSize: 8,
    color: colors.oxideDeep,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metaValue: { fontSize: 9, color: colors.ink, lineHeight: 1.35 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.oxideDeep,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: colors.line,
    paddingBottom: 3,
  },
  summaryBanner: {
    backgroundColor: colors.mist,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    fontSize: 9,
    lineHeight: 1.45,
    color: colors.ink,
  },
  eventCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  eventMeta: {
    fontSize: 8,
    color: colors.oxideDeep,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  eventTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: colors.ink, lineHeight: 1.35, marginBottom: 4 },
  eventDetail: { marginTop: 0, marginBottom: 3, fontSize: 9, color: colors.muted, lineHeight: 1.45 },
  certify: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    fontSize: 9,
    lineHeight: 1.45,
    color: colors.ink,
  },
  certifyLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.oxideDeep,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 24,
    fontSize: 7.5,
    color: colors.muted,
    borderTopWidth: 0.75,
    borderTopColor: colors.line,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export type SubmissionProofPdfInput = {
  report: SubmissionProofReport;
  practiceName: string;
  practiceAddress: string;
  practicePhone: string;
  practiceNpi: string;
  physicianName: string;
  patientName: string;
  payerName: string;
  dateOfService: string;
  billedAmount: string;
};

async function logoDataUri() {
  try {
    const file = path.join(process.cwd(), "public/brand/alignment-logo.png");
    const bytes = await readFile(file);
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function formatStamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function eventKindLabel(event: SubmissionProofReport["events"][number]) {
  if (event.kind === "acknowledgment") {
    if (event.reportedBy === "PAYER") return "Payer 277CA";
    if (event.reportedBy === "CLEARINGHOUSE" || event.reportedBy === "STEDI") return "Clearinghouse 277CA";
    return "277CA acknowledgment";
  }
  if (event.kind === "submission") return "Claim submission";
  if (event.kind === "payment") return "Payment / ERA";
  return "Timeline entry";
}

function eventHeadline(event: SubmissionProofReport["events"][number]) {
  if (event.kind === "acknowledgment") {
    return event.status ? `Status: ${event.status}` : event.title || "Claim acknowledgment received";
  }
  if (event.kind === "submission") return event.title || "Professional claim submitted to Stedi";
  return event.title;
}

function proofSummary(input: SubmissionProofPdfInput) {
  const events = input.report.events;
  const payerAcks = events.filter((event) => event.kind === "acknowledgment" && event.reportedBy === "PAYER");
  const clearingAcks = events.filter(
    (event) =>
      event.kind === "acknowledgment" && (event.reportedBy === "CLEARINGHOUSE" || event.reportedBy === "STEDI"),
  );
  const submitted = events.some((event) => event.kind === "submission");
  const parts: string[] = [];
  if (submitted) parts.push("Stedi recorded the electronic submission.");
  if (clearingAcks.length) {
    parts.push(`Clearinghouse returned ${clearingAcks.length} 277CA acknowledgment${clearingAcks.length === 1 ? "" : "s"}.`);
  }
  if (payerAcks.length) {
    const status = payerAcks[0]?.status ? ` (${payerAcks[0].status})` : "";
    parts.push(
      `${input.payerName || "The payer"} returned ${payerAcks.length} 277CA acknowledgment${payerAcks.length === 1 ? "" : "s"}${status}.`,
    );
  }
  if (!parts.length) return "No timeline events were available when this proof was generated.";
  return parts.join(" ");
}

function ProofDocument({ input, logo }: { input: SubmissionProofPdfInput; logo: string | null }) {
  const control = input.report.patientControlNumber;
  const claimId = input.report.stediClaimId;
  return (
    <Document
      title={`Claim submission proof — ${control}`}
      author={input.physicianName || practice.physicianName}
      subject="Stedi 277CA claim transmission acknowledgment"
      creator={practiceName.full}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          {logo ? <Image src={logo} style={styles.logo} /> : <Text style={styles.title}>{practice.name}</Text>}
          <View style={styles.headerMeta}>
            <Text style={styles.practiceLine}>{input.practiceName || practiceName.full}</Text>
            <Text style={styles.contactLine}>
              {input.practiceAddress || practice.addressLine}
              {"\n"}
              {input.practicePhone || practice.phone}
              {input.practiceNpi ? ` · NPI ${input.practiceNpi}` : ""}
              {"\n"}
              {practice.email}
            </Text>
          </View>
        </View>

        <Text style={styles.kicker}>Clearinghouse submission proof</Text>
        <Text style={styles.title}>Claim transmission acknowledgment</Text>
        <Text style={styles.subtitle}>
          Prepared for payer correspondence. Timeline reprinted from Stedi Claim Timeline (X12 277CA acknowledgments).
          Clinic letterhead identifies the submitting practice and does not alter Stedi's recorded events.
        </Text>

        <View style={styles.metaRow}>
          {[
            ["To payer", input.payerName],
            ["Patient", input.patientName],
            ["Date of service", input.dateOfService],
            ["Billed amount", input.billedAmount],
            ["Patient control number", control],
            ["Stedi claim id", claimId || "—"],
            ["Stedi status", input.report.status || "—"],
            ["Retrieved", formatStamp(input.report.fetchedAt)],
          ].map(([label, value]) => (
            <View key={label} style={styles.metaItem}>
              <Text style={styles.metaLabel}>{label}</Text>
              <Text style={styles.metaValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>What this proof shows</Text>
        <Text style={styles.summaryBanner}>{proofSummary(input)}</Text>

        <Text style={styles.sectionTitle}>277CA / claim timeline</Text>
        {input.report.events.length === 0 ? (
          <Text style={styles.eventDetail}>
            No timeline entries were returned yet. Clearinghouse indexing may still be in progress.
          </Text>
        ) : (
          input.report.events.map((event, index) => (
            <View key={`${event.kind}-${event.at}-${index}`} style={styles.eventCard} wrap={false}>
              <View style={{ marginBottom: 4 }}>
                <Text style={styles.eventMeta}>
                  {formatStamp(event.at)} · {eventKindLabel(event)}
                </Text>
              </View>
              <View style={{ marginBottom: 4 }}>
                <Text style={styles.eventTitle}>{eventHeadline(event)}</Text>
              </View>
              {event.sourceName ? (
                <View style={{ marginBottom: 2 }}>
                  <Text style={styles.eventDetail}>{`From: ${event.sourceName}`}</Text>
                </View>
              ) : null}
              {event.detail ? (
                <View>
                  <Text style={styles.eventDetail}>{event.detail}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}

        <View style={styles.certify}>
          <Text style={styles.certifyLabel}>Certification</Text>
          <Text>
            {input.practiceName || practice.name} certifies that the claim identified by patient control number {control}
            {claimId ? ` (Stedi claim id ${claimId})` : ""} was submitted electronically through Stedi. The events above
            are a reprint of Stedi Claim Timeline records, including X12 277CA claim acknowledgments. A payer-reported
            277CA means the payer (or its intermediary) returned an acknowledgment for this claim. Clearinghouse
            acceptance alone proves submission into the clearinghouse network and is not the same as payment.
          </Text>
          <Text style={{ marginTop: 8, fontSize: 9, color: colors.muted }}>
            Prepared by {input.physicianName || practice.physicianName} · {input.practiceName || practice.name}
            {"\n"}
            Source: Stedi Claims Lifecycle · Claim Timeline API
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {input.practiceName || practiceName.full} · Payer correspondence
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/** Render a branded Alignment Clinic submission-proof PDF from Stedi timeline data. */
export async function renderSubmissionProofPdf(input: SubmissionProofPdfInput): Promise<Buffer> {
  const logo = await logoDataUri();
  const buffer = await renderToBuffer(<ProofDocument input={input} logo={logo} />);
  return Buffer.from(buffer);
}
