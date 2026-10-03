import { BrandIcon } from "@/components/site/brand";

const promises = [
  { label: "Unhurried visits", src: "/brand/icons/unhurried-visits.svg" },
  { label: "Plain-language explanations", src: "/brand/icons/plain-language.svg" },
  { label: "Decisions made with you", src: "/brand/icons/shared-decisions.svg" },
  { label: "A plan you can follow", src: "/brand/icons/clear-plan.svg" },
] as const;

export function Promises() {
  return (
    <ul className="mx-auto mt-6 grid max-w-6xl grid-cols-2 gap-x-4 gap-y-4 md:mt-8 lg:grid-cols-4 lg:gap-x-8">
      {promises.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <BrandIcon src={item.src} />
          <span className="text-sm font-medium leading-snug text-ink">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
