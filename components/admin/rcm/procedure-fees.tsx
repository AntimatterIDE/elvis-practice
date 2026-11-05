"use client";

import { useEffect, useState } from "react";
import { medicareCharge, type ProcedureAmounts } from "@/lib/coding/fees";

export function useProcedureFees(codes: string[]) {
  const key = [...new Set(codes.map((code) => code.trim().toUpperCase()).filter((code) => /^[A-Z0-9]{5}$/.test(code)))].sort().join(",");
  const [fees, setFees] = useState<Record<string, ProcedureAmounts>>({});

  useEffect(() => {
    if (!key) return;
    let cancel = false;
    fetch(`/api/coding/fees?codes=${encodeURIComponent(key)}`)
      .then((response) => response.json())
      .then((payload: { fees?: Record<string, ProcedureAmounts> }) => {
        if (!cancel && payload.fees) setFees((current) => ({ ...current, ...payload.fees }));
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [key]);

  return fees;
}

export function pricedCharge(fees: Record<string, ProcedureAmounts>, code: string, placeOfService: string) {
  const amounts = fees[code.trim().toUpperCase()];
  if (!amounts) return 0;
  return medicareCharge(amounts, placeOfService || "11");
}
