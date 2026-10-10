import { canonicalOrigin, physicianTraining, practice } from "@/lib/site";

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
        medicalSpecialty: practice.specialty,
        description: practice.description,
        telephone: practice.phone,
        email: practice.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: practice.street,
          addressLocality: practice.city,
          addressRegion: practice.region,
          postalCode: practice.postalCode,
          addressCountry: "US",
        },
      },
      {
        "@type": "Physician",
        "@id": `${origin}${practice.physicianPath}#physician`,
        name: "Elvis Francois",
        honorificSuffix: "MD",
        url: `${origin}${practice.physicianPath}`,
        medicalSpecialty: practice.specialty,
        identifier: practice.npi,
        alumniOf: physicianTraining.map((item) => item.value),
        worksFor: { "@id": `${origin}#clinic` },
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
