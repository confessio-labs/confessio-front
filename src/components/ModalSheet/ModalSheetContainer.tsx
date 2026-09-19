"use client";
import { ReactNode, useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { usePathname } from "next/navigation";
import ModalSheetContainerClient from "./ModalSheetContainerClient";
import ModalSheetContainerServer from "./ModalSheetContainerServer";
import ModalSheet from "../ModalSheet";
import { optimisticChurchAtom } from "@/atoms";
import { useIsMobile } from "@/hooks/useIsMobile";

import "./ModalSheet.css";
const ModalSheetContainer = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const optimisticChurch = useAtomValue(optimisticChurchAtom);
  const setOptimisticChurch = useSetAtom(optimisticChurchAtom);
  const pathname = usePathname();

  // A committed navigation means the server-rendered @modal slot is now
  // authoritative — drop the optimistic card so the sheet falls back to it.
  // The atom is only ever set alongside a router.push, so the first pathname
  // change after that is the commit we're waiting for. The handoff remounts
  // ChurchCard (the slot is wrapped in Next's route boundaries, so it isn't
  // the same element as our inline <ModalSheet>); the query cache is already
  // warm, so it's a single seamless commit — but ChurchCard dedupes its
  // church_viewed capture so the remount isn't counted as a second view.
  useEffect(() => {
    setOptimisticChurch(null);
  }, [pathname, setOptimisticChurch]);

  const content = optimisticChurch ? (
    <ModalSheet selectedChurch={optimisticChurch} />
  ) : (
    children
  );

  if (isMobile)
    return <ModalSheetContainerClient>{content}</ModalSheetContainerClient>;
  return <ModalSheetContainerServer>{content}</ModalSheetContainerServer>;
};

export default ModalSheetContainer;
