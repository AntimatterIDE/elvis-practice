export type ProcedureAmounts = { nonFacility: number; facility: number };

// CMS place-of-service codes where the facility practice-expense RVU applies.
const facilityPlaces = new Set(["19", "21", "22", "23", "24", "26", "31", "34", "41", "42", "51", "52", "53", "56", "61"]);

export function medicareCharge(amounts: ProcedureAmounts, placeOfService: string) {
  const facility = facilityPlaces.has(placeOfService.trim());
  const preferred = facility ? amounts.facility : amounts.nonFacility;
  const other = facility ? amounts.nonFacility : amounts.facility;
  if (preferred > 0) return preferred;
  return other > 0 ? other : 0;
}
