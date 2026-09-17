"use client";
import { useCallback, useEffect, useState } from "react";
import type { Donation, DonationStatus, Nonprofit } from "./types";
import { SEED_DONATIONS, SEED_NONPROFITS } from "./seed";

const KEY = "rescueroute-fremont-v1";

interface Persisted {
  donations: Donation[];
}

function load(): Persisted {
  if (typeof window === "undefined") return { donations: SEED_DONATIONS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { donations: SEED_DONATIONS };
    const parsed = JSON.parse(raw) as Persisted;
    if (!Array.isArray(parsed.donations)) return { donations: SEED_DONATIONS };
    return parsed;
  } catch {
    return { donations: SEED_DONATIONS };
  }
}

export function useStore() {
  // Deterministic seed state: byte-identical on the server and on the FIRST
  // client render, so hydration always matches. Never read localStorage here —
  // reading it in a state initializer is what caused the hydration mismatch
  // (server rendered seeds, client rendered saved state).
  const [donations, setDonations] = useState<Donation[]>(SEED_DONATIONS);
  const [nonprofits] = useState<Nonprofit[]>(SEED_NONPROFITS);
  // False until the post-mount restore below has run. Persistence writes are
  // gated on this so seed defaults can never clobber saved state on load.
  const [restored, setRestored] = useState(false);

  // Restore persisted state after mount (client only). Post-mount sync with an
  // external store is the sanctioned use of setState in an effect; the first
  // render above stays deterministic, so hydration is unaffected.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time post-mount restore from localStorage; required for hydration safety
    setDonations(load().donations);
    setRestored(true);
  }, []);

  // Persist only after the restore check has completed.
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ donations } satisfies Persisted));
    } catch {
      // storage full / private mode — demo still works in memory
    }
  }, [donations, restored]);

  const addDonation = useCallback((d: Donation) => {
    setDonations((prev) => [d, ...prev]);
  }, []);

  const updateStatus = useCallback(
    (id: string, status: DonationStatus, patch: Partial<Donation> = {}) => {
      setDonations((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                ...patch,
                status,
                deliveredAt: status === "Delivered" ? new Date().toISOString() : d.deliveredAt,
              }
            : d
        )
      );
    },
    []
  );

  const reset = useCallback(() => {
    setDonations(SEED_DONATIONS);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  return { donations, nonprofits, addDonation, updateStatus, reset, hydrated: true };
}
