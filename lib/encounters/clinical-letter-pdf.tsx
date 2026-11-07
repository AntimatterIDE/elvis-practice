import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactNode } from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { practice, practiceName } from "@/lib/site";
import type { ClinicalLetterDraft } from "@/lib/encounters/clinical-letter";

const colors = {
  ink: "#0b1f33",
  muted: "#4a6074",
  line: "#d3e0ea",
  oxide: "#0e8f84",
  oxideDeep: "#0a6e66",
  clinicBlue: "#0b3d78",
  mist: "#e7f2f8",
  paper: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.ink,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 48,
    backgroundColor: colors.paper,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: colors.oxide,
    paddingBottom: 14,
    marginBottom: 18,
  },
  logo: {
    width: 148,
    height: 42,
    objectFit: "contain",
  },
  headerMeta: {
    alignItems: "flex-end",
    maxWidth: 220,
  },
  practiceLine: {
    fontSize: 8,
    color: colors.clinicBlue,
    textAlign: "right",
    lineHeight: 1.35,
  },
  contactLine: {
    marginTop: 4,
    fontSize: 8,
    color: colors.muted,
    textAlign: "right",
    lineHeight: 1.35,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: colors.clinicBlue,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: 14,
  },
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
  metaItem: {
    width: "48%",
    fontSize: 9,
    lineHeight: 1.4,
  },
  metaLabel: {
    color: colors.oxideDeep,
    fontFamily: "Helvetica-Bold",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.oxideDeep,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
    borderBottomWidth: 0.75,
    borderBottomColor: colors.line,
    paddingBottom: 3,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.45,
    color: colors.ink,
  },
  bullet: {
    fontSize: 10,
    lineHeight: 1.45,
    marginBottom: 2,
    paddingLeft: 4,
  },
  signatureBlock: {
    marginTop: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  signatureName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.ink,
  },
  signatureTitle: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ text }: { text: string }) {
  if (!text.trim()) return <Text style={styles.body}>—</Text>;
  return <Text style={styles.body}>{text.trim()}</Text>;
}

async function logoDataUri() {
  try {
    const file = path.join(process.cwd(), "public/brand/alignment-logo.png");
    const bytes = await readFile(file);
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function LetterDocument({ draft, logo }: { draft: ClinicalLetterDraft; logo: string | null }) {
  const assessment =
    draft.assessment.length > 0
      ? draft.assessment
      : ["No assessment items were documented in the visit note."];

  return (
    <Document
      title={`${draft.title} — ${draft.patientName}`}
      author={practice.physicianName}
      subject={practiceName.full}
      creator={practiceName.full}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          {logo ? <Image src={logo} style={styles.logo} /> : <Text style={styles.title}>{practice.name}</Text>}
          <View style={styles.headerMeta}>
            <Text style={styles.practiceLine}>{practiceName.full}</Text>
            <Text style={styles.contactLine}>
              {practice.addressLine}
              {"\n"}
              {practice.phone} · {practice.email}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{draft.title || "Clinical Letter"}</Text>
        <Text style={styles.subtitle}>Prepared from the clinical visit note for care coordination and records.</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Patient: </Text>
            {draft.patientName}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date of birth: </Text>
            {draft.dateOfBirth || "—"}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date of service: </Text>
            {draft.dateOfService || "—"}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Physician: </Text>
            {draft.physicianName}
          </Text>
        </View>

        <Section title="Reason for evaluation">
          <Paragraph text={draft.reasonForEvaluation} />
        </Section>
        <Section title="History of present illness">
          <Paragraph text={draft.historyOfPresentIllness} />
        </Section>
        {draft.relevantHistory.trim() ? (
          <Section title="Relevant history">
            <Paragraph text={draft.relevantHistory} />
          </Section>
        ) : null}
        {draft.diagnosticStudies.trim() ? (
          <Section title="Diagnostic studies">
            <Paragraph text={draft.diagnosticStudies} />
          </Section>
        ) : null}
        {draft.examination.trim() ? (
          <Section title="Examination">
            <Paragraph text={draft.examination} />
          </Section>
        ) : null}
        <Section title="Assessment">
          {assessment.map((item, index) => (
            <Text key={`${index}-${item.slice(0, 24)}`} style={styles.bullet}>
              {`${index + 1}. ${item}`}
            </Text>
          ))}
        </Section>
        <Section title="Discussion and plan">
          <Paragraph text={draft.discussionAndPlan} />
        </Section>

        <View style={styles.signatureBlock}>
          <Text style={styles.signatureName}>{draft.physicianName}</Text>
          <Text style={styles.signatureTitle}>{draft.physicianTitle}</Text>
          <Text style={styles.signatureTitle}>{practiceName.full}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>{practiceName.full}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/** Render a branded Clinical Letter PDF. */
export async function renderClinicalLetterPdf(draft: ClinicalLetterDraft): Promise<Buffer> {
  const logo = await logoDataUri();
  const buffer = await renderToBuffer(<LetterDocument draft={draft} logo={logo} />);
  return Buffer.from(buffer);
}
