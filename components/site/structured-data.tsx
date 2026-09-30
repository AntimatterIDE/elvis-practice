import { canonicalOrigin, practice } from "@/lib/site";

export function StructuredData() {
  const origin = canonicalOrigin();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalClinic",
        "@id": `${origin}#clinic`,
        name: practice.name,
        url: origin,
      },
      {
        "@type": "Physician",
        "@id": `${origin}${practice.physicianPath}#physician`,
        name: "Elvis Francois",
        honorificSuffix: "MD",
        url: `${origin}${practice.physicianPath}`,
        worksFor: { "@id": `${origin}#clinic` },
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
