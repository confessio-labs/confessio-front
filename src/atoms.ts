import { atom } from "jotai";
import { components } from "@/types";

export const isSearchFocusedAtom = atom(false);

// Bridges the gap between a pin/tile click and the server @modal slot
// committing. When set, the sheet renders this church summary immediately
// (see ModalSheetContainer); it is cleared on the next committed navigation,
// handing off to the server-rendered card.
export const optimisticChurchAtom =
  atom<components["schemas"]["ChurchDetails"] | null>(null);
