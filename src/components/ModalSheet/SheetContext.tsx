import { createContext, useContext } from "react";
import { SheetRef } from "react-modal-sheet";

export const TOP_SNAP = 0.9;

export const SheetRefContext = createContext<React.RefObject<SheetRef | null> | null>(null);
export const useSheetRef = () => useContext(SheetRefContext);
