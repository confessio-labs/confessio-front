import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAtom } from "jotai";
import { isModeratorModeAtom } from "@/atoms";

const MODERATOR_TAPS = 5;
const TAP_WINDOW_MS = 1500;

const NavigationModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isModeratorMode, setIsModeratorMode] = useAtom(isModeratorModeAtom);
  const taps = useRef({ count: 0, last: 0 });
  const [toast, setToast] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);

  useEffect(() => {
    if (!isToastVisible) return;
    const timeout = setTimeout(() => setIsToastVisible(false), 1800);
    return () => clearTimeout(timeout);
  }, [isToastVisible, toast]);

  const onVersionTap = () => {
    const now = Date.now();
    const t = taps.current;
    t.count = now - t.last < TAP_WINDOW_MS ? t.count + 1 : 1;
    t.last = now;
    if (t.count < MODERATOR_TAPS) return;
    t.count = 0;
    setIsModeratorMode(!isModeratorMode);
    setToast(
      isModeratorMode ? "Mode modérateur désactivé" : "Mode modérateur activé",
    );
    setIsToastVisible(true);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current.close();
      }}
      className="m-auto border-0 bg-transparent p-0 backdrop:bg-deepblue/90"
    >
      <div className="rounded-xl py-4 px-8 bg-deepblue gap-4 flex flex-col items-stretch justify-center w-[80vw] max-w-96">
        <div className="flex gap-2 items-center justify-center">
          <Image
            src="/confessioLogoWhite.svg"
            alt="Confession Logo"
            width={24}
            height={24}
          />
          <h2 className="text-white font-semibold md:text-xl">Confessio</h2>
        </div>
        <div className="flex flex-col gap-0.5 items-center justify-cente text-sm">
          <Link
            className="py-2 bg-white text-deepblue w-full text-center rounded-t-xl md:text-lg"
            href="https://confessio.fr/contact"
          >
            Nous contacter
          </Link>
          <Link
            className="py-2 bg-white text-deepblue w-full text-center md:text-lg"
            href="https://confessio.fr/about"
          >
            Qui sommes-nous ?
          </Link>
          <Link
            className="py-2 bg-white text-deepblue w-full text-center md:text-lg"
            href="https://confessio.fr/api/docs"
          >
            API
          </Link>
          <Link
            className="py-2 bg-white text-deepblue w-full text-center md:text-lg"
            href="https://confessio.fr/accounts/login/"
          >
            Espace Administrateur
          </Link>
          <Link
            className="py-2 bg-white text-deepblue w-full text-center rounded-b-xl md:text-lg"
            href="https://play.google.com/store/apps/details?id=com.hdgdev.confession"
            target="_blank"
            rel="noopener noreferrer"
          >
            Télécharger l&apos;application Android
          </Link>
        </div>
        <p className="text-xs text-gray-300 text-center">
          Code open-source disponible sur{" "}
          <Link
            href="https://github.com/etiennecallies/confessio"
            className="underline"
          >
            Github
          </Link>
          <br />
          Made in 🇫🇷 with ✝️ without 🍪
          {process.env.NEXT_PUBLIC_APP_VERSION && (
            <>
              <br />
              <span
                className="tabular select-none"
                onClick={onVersionTap}
                data-testid="app-version"
              >
                v{process.env.NEXT_PUBLIC_APP_VERSION}
              </span>
            </>
          )}
        </p>
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="text-xs text-gray-300">
            Un projet généreusement encouragé par
          </span>
          <a
            href="https://hozana.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/hozana-logo-white.png"
              alt="Hozana"
              height={28}
              width={112}
            />
          </a>
        </div>
      </div>
      <div
        role="status"
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper px-3.5 py-1.5 text-[12.5px] font-medium text-deepblue shadow-[0_4px_14px_-4px_rgba(0,0,0,0.3)] transition-opacity duration-200 pointer-events-none ${isToastVisible ? "opacity-100" : "opacity-0"}`}
      >
        {toast}
      </div>
    </dialog>
  );
};

export { NavigationModal };
