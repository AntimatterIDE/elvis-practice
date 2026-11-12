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
    gap: 8,
    backgroundColor: colors.mist,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  metaItem: { width: "48%", fontSize: 9, lineHeight: 1.4 },
  metaLabel: { color: colors.oxideDeep, fontFamily: "Helvetica-Bold" },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.oxideDeep,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    borderBottomWidth: 0.75,
    borderBottomColor: colors.line,
    paddingBottom: 3,
  },
  eventRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.line,
  },
  eventWhen: { width: 88, fontSize: 8, color: colors.muted, lineHeight: 1.35 },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: colors.ink },
  eventDetail: { marginTop: 2, fontSize: 9, color: colors.muted, lineHeight: 1.35 },
  certify: {
    marginTop: 14,
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
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>To payer: </Text>
            {input.payerName}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Patient: </Text>
            {input.patientName}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date of service: </Text>
            {input.dateOfService}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Billed amount: </Text>
            {input.billedAmount}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Patient control number: </Text>
            {control}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Stedi claim id: </Text>
            {claimId || "—"}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Stedi status: </Text>
            {input.report.status || "—"}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Retrieved: </Text>
            {formatStamp(input.report.fetchedAt)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>277CA / claim timeline</Text>
        {input.report.events.length === 0 ? (
          <Text style={styles.eventDetail}>No timeline entries were returned yet. Clearinghouse indexing may still be in progress.</Text>
        ) : (
          input.report.events.map((event, index) => (
            <View key={`${event.kind}-${event.at}-${index}`} style={styles.eventRow} wrap={false}>
              <Text style={styles.eventWhen}>
                {formatStamp(event.at)}
                {"\n"}
                {event.kind}
                {event.reportedBy ? ` · ${event.reportedBy}` : ""}
              </Text>
              <View style={styles.eventBody}>
                <Text style={styles.eventTitle}>
                  {event.title}
                  {event.status ? ` (${event.status})` : ""}
                </Text>
                {event.detail ? <Text style={styles.eventDetail}>{event.detail}</Text> : null}
                {event.sourceName ? <Text style={styles.eventDetail}>Reported by: {event.sourceName}</Text> : null}
              </View>
            </View>
          ))
        )}

        <View style={styles.certify}>
          <Text style={styles.certifyLabel}>Certification</Text>
          <Text>
            {input.practiceName || practice.name} certifies that the claim identified by patient control number {control}
            {claimId ? ` (Stedi claim id ${claimId})` : ""} was submitted electronically through Stedi. The events above
            are a reprint of Stedi Claim Timeline records, including X12 277CA claim acknowledgments. A payer-reported
            277CA is evidence the payer (or its intermediary) returned an acknowledgment for this claim. Clearinghouse
            acceptance alone proves submission into the clearinghouse network and is not the same as payment.
          </Text>
          <Text style={{ marginTop: 8, fontSize: 9, color: colors.muted }}>
            {input.physicianName || practice.physicianName} · {input.practiceName || practice.name} · Source: Stedi Claims
            Lifecycle · Claim Timeline
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
