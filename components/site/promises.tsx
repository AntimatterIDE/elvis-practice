import { BrandIcon } from "@/components/site/brand";

const promises = [
  { label: "Unhurried visits", src: "/brand/icons/unhurried-visits.svg" },
  { label: "Plain-language explanations", src: "/brand/icons/plain-language.svg" },
  { label: "Decisions made with you", src: "/brand/icons/shared-decisions.svg" },
  { label: "A plan you can follow", src: "/brand/icons/clear-plan.svg" },
] as const;

export function Promises() {
  return (
    <ul className="mt-8 grid max-w-2xl grid-cols-1 gap-x-10 gap-y-2.5 sm:grid-cols-2">
      {promises.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <BrandIcon src={item.src} className="size-6" />
          <span className="text-sm font-medium leading-snug text-ink">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
