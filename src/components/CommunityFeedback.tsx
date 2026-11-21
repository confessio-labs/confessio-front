import { components } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";
import { APP_TIME_ZONE, fetchApi } from "@/utils";
import { useKeyboardOverlap } from "@/hooks/useKeyboardOverlap";
import { TOP_SNAP, useSheetRef } from "./ModalSheet/SheetContext";
import {
  CameraIcon,
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
  CheckIcon,
  CircleNotchIcon,
  ClockIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  SealCheckIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";

type ChurchDetails = components["schemas"]["ChurchDetails"];
type CommentOut = components["schemas"]["CommentOut"];
type NoteTtl = components["schemas"]["NoteTtl"];
type IssueIn = components["schemas"]["IssueIn"];
type ApprovalIn = components["schemas"]["ApprovalIn"];
type TextNoteIn = components["schemas"]["TextNoteIn"];

type EntryKind = "issue" | "approval" | "text_note" | "file_note";

const ENDPOINTS: Record<EntryKind, string> = {
  issue: "/issues",
  approval: "/approvals",
  text_note: "/text_notes",
  file_note: "/file_notes",
};

type Submission =
  | { kind: "issue"; payload: IssueIn }
  | { kind: "approval"; payload: ApprovalIn }
  | { kind: "text_note"; payload: TextNoteIn };

type Step =
  | "root"
  | "validate"
  | "fork"
  | "complete"
  | "report"
  | "sent-good"
  | "sent-complement"
  | "sent-report";

const TTL_OPTIONS: { key: NoteTtl; label: string }[] = [
  { key: "one_week", label: "1 semaine" },
  { key: "one_month", label: "1 mois" },
  { key: "one_year", label: "1 an" },
];

const KIND_LABELS: Record<EntryKind, string> = {
  issue: "Signalement",
  approval: "Validation",
  text_note: "Complément",
  file_note: "Photo",
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

type Entry = {
  kind: EntryKind;
  uuid: string;
  createdAt: string;
  content: string | null;
  image: string | null;
  comments: CommentOut[];
  // When the entry left the live list: an issue's resolution, or a note's
  // expiry once it has passed. Null while the entry is still live.
  closedAt: string | null;
};

const byNewest = (a: Entry, b: Entry) => (a.createdAt < b.createdAt ? 1 : -1);

const archivedLabel = (entry: Entry) => {
  const day = formatShortDay(entry.closedAt!);
  switch (entry.kind) {
    case "issue":
      return `Signalement résolu le ${day}`;
    case "file_note":
      return `Photo expirée le ${day}`;
    default:
      return `Complément expiré le ${day}`;
  }
};

const renderCommentBody = (raw: string) => {
  const text = raw.replace(/\\r\\n|\\r|\\n/g, "\n");
  return text.split(URL_REGEX).map((part, i) => {
    if (!/^https?:\/\//.test(part)) return part;
    const trailingMatch = part.match(/[.,;:!?)\]]+$/);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const url = trailing ? part.slice(0, -trailing.length) : part;
    return (
      <span key={i}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-deepblue underline underline-offset-2 hover:text-deepblue/70"
        >
          {url}
        </a>
        {trailing}
      </span>
    );
  });
};

const formatShortDay = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: APP_TIME_ZONE,
  });

const StaffReply = ({ comment }: { comment: CommentOut }) => (
  <div className="mt-2.5 bg-white border border-hairline rounded-xl px-2.5 py-2 flex flex-col gap-0.5">
    <div className="flex items-center gap-1.5">
      <SealCheckIcon
        size={13}
        weight="fill"
        className="shrink-0 text-deepblue"
      />
      <span className="text-[11.5px] font-semibold text-deepblue">
        Réponse de l&apos;équipe Confessio
      </span>
      <span className="tabular ml-auto text-deepblue/50 text-[11px] font-medium">
        {formatShortDay(comment.created_at)}
      </span>
    </div>
    <p className="text-ink text-[12.5px] leading-normal whitespace-pre-line [overflow-wrap:anywhere]">
      {renderCommentBody(comment.content)}
    </p>
    {comment.user?.first_name && (
      <span className="text-deepblue/50 text-[11px] font-medium">
        {comment.user.first_name}
      </span>
    )}
  </div>
);

const Replies = ({ comments }: { comments: CommentOut[] }) => (
  <div className="mt-2.5 pl-3 border-l border-ink/15 flex flex-col gap-2.5">
    {comments.map((comment) => (
      <div key={comment.uuid} className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          {comment.user?.first_name ? (
            <span className="text-deepblue text-[11.5px] font-semibold">
              {comment.user.first_name}
            </span>
          ) : (
            <span className="text-deepblue/50 text-[11.5px] font-medium">
              Anonyme
            </span>
          )}
          <span className="tabular ml-auto text-deepblue/50 text-[11px] font-medium">
            {formatShortDay(comment.created_at)}
          </span>
        </div>
        <p className="text-ink text-[12.5px] leading-normal whitespace-pre-line [overflow-wrap:anywhere]">
          {renderCommentBody(comment.content)}
        </p>
      </div>
    ))}
  </div>
);

const entryIcon = (entry: Entry) => {
  if (entry.closedAt)
    return entry.kind === "issue" ? (
      <CheckIcon size={11} weight="bold" />
    ) : (
      <ClockIcon size={11} weight="bold" />
    );
  switch (entry.kind) {
    case "issue":
      return <WarningCircleIcon size={11} weight="bold" />;
    case "approval":
      return <CheckIcon size={11} weight="bold" />;
    case "file_note":
      return <CameraIcon size={11} />;
    default:
      return <PlusIcon size={11} weight="bold" />;
  }
};

const EntryCard = ({
  entry,
  children,
}: {
  entry: Entry;
  children?: React.ReactNode;
}) => (
  <div className="bg-paper rounded-xl px-3 py-2.5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.2)]">
    <div className="flex items-center gap-1.5 mb-1.5">
      <KindChip
        label={entry.closedAt ? archivedLabel(entry) : KIND_LABELS[entry.kind]}
        tone={entry.kind === "issue" && !entry.closedAt ? "warn" : "neutral"}
        icon={entryIcon(entry)}
      />
      <span className="tabular ml-auto text-[10.5px] font-medium text-deepblue/50">
        {formatShortDay(entry.createdAt)}
      </span>
    </div>
    {entry.image ? (
      <div className="flex flex-col gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.image}
          // object-contain, never cover: these are photos of
          // schedule boards, so cropping would eat the text.
          alt="Photo des horaires"
          loading="lazy"
          className="w-full h-auto max-h-[240px] object-contain rounded-lg"
        />
        {entry.content && (
          <p className="text-ink/70 text-[12px] leading-normal whitespace-pre-line [overflow-wrap:anywhere]">
            {renderCommentBody(entry.content)}
          </p>
        )}
      </div>
    ) : (
      entry.content && (
        <p className="text-ink text-[12.5px] leading-normal whitespace-pre-line [overflow-wrap:anywhere]">
          {renderCommentBody(entry.content)}
        </p>
      )
    )}
    <Thread comments={entry.comments} />
    {children}
  </div>
);

const Thread = ({ comments }: { comments: CommentOut[] }) => {
  const sorted = [...comments].sort((a, b) =>
    a.created_at < b.created_at ? -1 : 1,
  );
  const staff = sorted.filter((c) => c.user?.is_staff);
  const others = sorted.filter((c) => !c.user?.is_staff);
  return (
    <>
      {staff.map((comment) => (
        <StaffReply key={comment.uuid} comment={comment} />
      ))}
      {others.length > 0 && <Replies comments={others} />}
    </>
  );
};

// Not scrollIntoView: it also scrolls every scrollable ancestor, including
// react-modal-sheet's fixed `overflow: hidden` wrapper. While the sheet is
// translated off-screen that wrapper has scroll room, and once scrolled it
// never resets — every snap point then renders shifted up.
// Scrolls only the panel's own scroller so the panel ends at the bottom of the
// screen once the sheet settles at its top snap. The sheet is bottom-anchored
// and only translated, so even there its bottom (1 - TOP_SNAP) runs
// off-screen. Only rect differences are used, so the in-flight snap animation
// (a transform shared by panel and scroller) doesn't skew the result.
const revealAtTopSnap = (panel: HTMLElement | null) => {
  let scroller = panel?.parentElement ?? null;
  while (scroller && !/auto|scroll/.test(getComputedStyle(scroller).overflowY))
    scroller = scroller.parentElement;
  if (!panel || !scroller) return;
  const sheetEl = scroller.closest(".react-modal-sheet-container");
  const sheetHeight = sheetEl?.getBoundingClientRect().height ?? 0;
  const hiddenBelow = sheetHeight - Math.round(TOP_SNAP * sheetHeight);
  const overshoot =
    panel.getBoundingClientRect().bottom -
    scroller.getBoundingClientRect().bottom +
    hiddenBelow;
  scroller.scrollTo({
    top: scroller.scrollTop + overshoot,
    behavior: "smooth",
  });
};

const KindChip = ({
  label,
  icon,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  tone: "neutral" | "warn";
}) => (
  <span
    className={[
      "inline-flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10.5px] font-semibold tracking-[0.01em]",
      tone === "warn"
        ? "bg-warn-amber-bg text-warn-amber"
        : "bg-deepblue/8 text-deepblue",
    ].join(" ")}
  >
    {icon}
    {label}
  </span>
);

const Choice = ({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-2.5 text-left rounded-xl border border-hairline hover:border-deepblue/40 hover:bg-deepblue/3 px-3 py-2.5 transition-colors"
  >
    <span className="shrink-0 text-deepblue/55">{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-[13.5px] font-semibold text-deepblue tracking-[-0.005em]">
        {title}
      </span>
    </span>
    <CaretRightIcon
      size={14}
      weight="bold"
      className="shrink-0 text-deepblue/35"
    />
  </button>
);

const SendButton = ({
  label,
  pending,
  disabled = false,
  onClick,
}: {
  label: string;
  pending: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={pending || disabled}
    className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full bg-deepblue text-white text-[13.5px] font-semibold hover:bg-deepblue/90 transition-colors disabled:opacity-60"
  >
    {pending ? (
      <CircleNotchIcon size={14} weight="bold" className="animate-spin" />
    ) : (
      <PaperPlaneTiltIcon size={14} weight="fill" />
    )}
    {label}
  </button>
);

const ReplyControls = ({
  open,
  sent,
  text,
  pending,
  failed,
  onToggle,
  onChange,
  onSend,
}: {
  open: boolean;
  sent: boolean;
  text: string;
  pending: boolean;
  failed: boolean;
  onToggle: () => void;
  onChange: (text: string) => void;
  onSend: () => void;
}) => (
  <>
    {open && (
      <div className="mt-2 flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Votre réponse"
          rows={2}
          autoFocus
          // Keep mobile font-size >= 16px: iOS Safari force-zooms into inputs below 16px. Do not lower.
          className="w-full resize-none rounded-xl border border-hairline bg-white px-2.5 py-2 text-ink text-[16px] md:text-[13px] leading-normal placeholder:text-ink/38 focus:outline-none focus:border-lightblue/55"
        />
        {failed && (
          <p className="text-rose-600 text-[12px]">
            L&apos;envoi a échoué. Réessayez.
          </p>
        )}
        <SendButton
          label="Envoyer ma réponse"
          pending={pending}
          disabled={!text.trim()}
          onClick={onSend}
        />
      </div>
    )}
    {sent ? (
      <p className="mt-1 text-right text-deepblue/50 text-[12px]">
        Réponse envoyée, en attente de vérification
      </p>
    ) : (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="block ml-auto mt-1 text-deepblue/50 hover:text-deepblue text-[12px]"
      >
        {open ? "Annuler" : "Répondre"}
      </button>
    )}
  </>
);

const Confirmation = ({
  title,
  detail,
  tone,
  onDone,
}: {
  title: string;
  detail: string;
  tone: "done" | "waiting";
  onDone: () => void;
}) => (
  <div className="flex flex-col gap-2.5">
    <div className="flex items-start gap-2.5">
      <span
        className={[
          "shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center",
          tone === "waiting"
            ? "bg-warn-amber-bg text-warn-amber"
            : "bg-deepblue/8 text-deepblue",
        ].join(" ")}
      >
        {tone === "waiting" ? (
          <ClockIcon size={17} weight="bold" />
        ) : (
          <CheckIcon size={17} weight="bold" />
        )}
      </span>
      <div>
        <h4 className="text-[13.5px] font-semibold text-deepblue tracking-[-0.005em]">
          {title}
        </h4>
        <p className="text-[12px] leading-normal text-deepblue/62">{detail}</p>
      </div>
    </div>
    <button
      type="button"
      onClick={onDone}
      className="w-full min-h-[44px] rounded-full bg-deepblue text-white text-[13.5px] font-semibold hover:bg-deepblue/90 transition-colors"
    >
      Revenir aux horaires
    </button>
  </div>
);

const CommunityFeedback = ({
  church,
  churchDetails,
}: {
  church: components["schemas"]["ChurchDetails"];
  churchDetails: ChurchDetails | undefined;
}) => {
  const queryClient = useQueryClient();
  const websiteUuid = churchDetails?.website?.uuid;
  const canReport = Boolean(websiteUuid);

  const [step, setStep] = useState<Step>("root");
  const [comment, setComment] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [ttl, setTtl] = useState<NoteTtl>("one_year");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sentReplyTo, setSentReplyTo] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [now] = useState(() => Date.now());

  const website = churchDetails?.website;
  const { upvotes, lastGoodAt, liveEntries, archivedEntries } = useMemo(() => {
    const approvals = website?.approvals ?? [];
    const lastApproval = approvals.reduce<string | null>(
      (latest, a) => (!latest || a.created_at > latest ? a.created_at : latest),
      null,
    );

    const sourceImageUrls = new Set(
      (churchDetails?.parsings ?? [])
        .map((p) => p.image_url)
        .filter((url): url is string => !!url),
    );
    const expiredAt = (expireAt: string) =>
      Date.parse(expireAt) <= now ? expireAt : null;

    const all: Entry[] = [
      ...(website?.issues ?? []).map((issue) => ({
        kind: "issue" as const,
        uuid: issue.uuid,
        createdAt: issue.created_at,
        content: issue.content,
        image: null,
        comments: issue.comments,
        closedAt: issue.solved_at,
      })),
      ...approvals
        .filter((approval) => approval.content)
        .map((approval) => ({
          kind: "approval" as const,
          uuid: approval.uuid,
          createdAt: approval.created_at,
          content: approval.content,
          image: null,
          comments: approval.comments,
          closedAt: null,
        })),
      ...(website?.text_notes ?? []).map((note) => ({
        kind: "text_note" as const,
        uuid: note.uuid,
        createdAt: note.created_at,
        content: note.content,
        image: null,
        comments: note.comments,
        closedAt: expiredAt(note.expire_at),
      })),
      ...(website?.file_notes ?? [])
        .filter((note) => !sourceImageUrls.has(note.public_url))
        .map((note) => ({
          kind: "file_note" as const,
          uuid: note.uuid,
          createdAt: note.created_at,
          content: note.caption,
          image: note.public_url,
          comments: note.comments,
          closedAt: expiredAt(note.expire_at),
        })),
    ].sort(byNewest);

    return {
      upvotes: approvals.length,
      lastGoodAt: lastApproval,
      liveEntries: all.filter((entry) => !entry.closedAt),
      archivedEntries: all.filter((entry) => entry.closedAt),
    };
  }, [website, churchDetails?.parsings, now]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const postSubmission = useMutation({
    mutationFn: async ({ kind, payload }: Submission) =>
      fetchApi(ENDPOINTS[kind], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, { kind }) => {
      queryClient.invalidateQueries({
        queryKey: ["churchDetails", church.uuid],
      });
      if (kind === "approval") {
        posthog.capture("church_upvoted", {
          church_uuid: church.uuid,
          church_name: church.name,
        });
      }
      setStep(
        kind === "approval"
          ? "sent-good"
          : kind === "issue"
            ? "sent-report"
            : "sent-complement",
      );
    },
  });

  const postFileNote = useMutation({
    mutationFn: async () => {
      if (!websiteUuid) throw new Error("missing website uuid");
      if (!photoFile) throw new Error("missing file");
      const form = new FormData();
      form.append("website_uuid", websiteUuid);
      form.append("church_uuid", church.uuid);
      if (comment.trim()) form.append("caption", comment.trim());
      if (email.trim()) form.append("email", email.trim());
      form.append("ttl", ttl);
      form.append("document", photoFile);
      // Do NOT set Content-Type — the browser sets the multipart boundary.
      return fetchApi(ENDPOINTS.file_note, {
        method: "POST",
        body: form,
      }) as Promise<components["schemas"]["FileNoteOut"]>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["churchDetails", church.uuid],
      });
      posthog.capture("image_uploaded", {
        church_uuid: church.uuid,
        church_name: church.name,
      });
      setStep("sent-complement");
    },
  });

  const postReply = useMutation({
    mutationFn: async ({
      entry,
      payload,
    }: {
      entry: Entry;
      payload: components["schemas"]["CommentIn"];
    }) =>
      fetchApi(`${ENDPOINTS[entry.kind]}/${entry.uuid}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, { entry }) => {
      queryClient.invalidateQueries({
        queryKey: ["churchDetails", church.uuid],
      });
      setSentReplyTo(entry.uuid);
      setReplyTo(null);
      setReplyText("");
    },
  });

  const toggleReply = (uuid: string) => {
    setReplyTo(replyTo === uuid ? null : uuid);
    setReplyText("");
    setSentReplyTo(null);
    postReply.reset();
  };

  const submitReply = (entry: Entry) => {
    postReply.mutate({ entry, payload: { content: replyText.trim() } });
  };

  const resetDraft = () => {
    setComment("");
    setCommentOpen(false);
    setEmail("");
    setTtl("one_year");
    setPhotoFile(null);
    setPhotoError(null);
    setReplyTo(null);
    setReplyText("");
    setSentReplyTo(null);
    postSubmission.reset();
    postFileNote.reset();
    postReply.reset();
  };

  const goRoot = () => {
    setStep("root");
    resetDraft();
  };

  const submit = (kind: Submission["kind"]) => {
    if (!websiteUuid) return;
    const base = {
      website_uuid: websiteUuid,
      church_uuid: church.uuid,
      email: email.trim() || null,
    };
    const content = comment.trim();
    postSubmission.mutate(
      kind === "text_note"
        ? { kind, payload: { ...base, content, ttl } }
        : { kind, payload: { ...base, content: content || null } },
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-picking the same file on a later attempt.
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choisissez une image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setPhotoError("Image trop lourde (10 Mo maximum).");
      return;
    }
    setPhotoError(null);
    postFileNote.reset();
    setPhotoFile(file);
  };

  // iOS keyboard vs the bottom sheet: the panel lives in a fixed, transformed
  // sheet sized off window.innerHeight, and on iOS the keyboard overlays the
  // page instead of resizing it, so the panel ends up behind the keyboard and
  // iOS's automatic scroll-into-view fails inside the fixed sheet. Expand the
  // sheet, pad the panel by the keyboard height, then align its padded bottom
  // with the scroller bottom — which puts the panel right above the keyboard.
  const sheetRef = useSheetRef();
  const panelRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLDivElement>(null);
  const isFormStep =
    step === "validate" || step === "complete" || step === "report";
  const keyboardOverlap = useKeyboardOverlap(isFormStep || replyTo !== null);
  useEffect(() => {
    if (keyboardOverlap === 0) return;
    sheetRef?.current?.snapTo(0);
    revealAtTopSnap(replyTo ? replyRef.current : panelRef.current);
  }, [keyboardOverlap, sheetRef, replyTo]);

  const inValidateBranch = step === "validate" || step === "sent-good";
  const inAddBranch =
    step !== "root" && step !== "validate" && step !== "sent-good";

  const isOpen = step !== "root";
  useEffect(() => {
    if (!isOpen) return;
    sheetRef?.current?.snapTo(0);
    revealAtTopSnap(panelRef.current);
  }, [isOpen, sheetRef]);

  const openFork = () => {
    if (inAddBranch) {
      goRoot();
      return;
    }
    posthog.capture("feedback_fork_opened", {
      church_uuid: church.uuid,
      church_name: church.name,
    });
    setStep("fork");
    resetDraft();
  };

  const openValidate = () => {
    if (inValidateBranch) {
      goRoot();
      return;
    }
    setStep("validate");
    resetDraft();
  };

  const sourceHost = useMemo(() => {
    const url = churchDetails?.website?.home_url;
    if (!url) return null;
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }, [churchDetails?.website?.home_url]);

  const validityPicker = (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11.5px] font-semibold text-deepblue/62">
        Valable pendant
      </span>
      <div className="flex gap-1.5">
        {TTL_OPTIONS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setTtl(v.key)}
            className={[
              "flex-1 rounded-full border py-1.5 text-[12px] font-semibold transition-colors",
              ttl === v.key
                ? "bg-deepblue border-deepblue text-white"
                : "bg-transparent border-hairline text-deepblue/70 hover:border-deepblue/40",
            ].join(" ")}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );

  const emailField = (
    <div className="flex flex-col gap-1">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Votre e-mail (facultatif)"
        // Keep mobile font-size >= 16px: iOS Safari force-zooms into inputs below 16px. Do not lower.
        className="w-full rounded-xl border border-hairline bg-white px-2.5 py-2 text-ink text-[16px] md:text-[13px] placeholder:text-ink/38 focus:outline-none focus:border-lightblue/55"
      />
      <p className="text-[11px] leading-snug text-deepblue/50">
        Pour être prévenu d&apos;une réponse. Jamais affiché.
      </p>
    </div>
  );

  const photoErrorText = photoError ? (
    <p className="text-rose-600 text-[12px]">{photoError}</p>
  ) : null;

  const sendError =
    postSubmission.isError || postFileNote.isError ? (
      <p className="text-rose-600 text-[12px]">
        L&apos;envoi a échoué. Réessayez.
      </p>
    ) : null;

  const panel = () => {
    switch (step) {
      case "validate":
        return (
          <>
            {commentOpen && (
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Votre commentaire"
                rows={2}
                autoFocus
                // Keep mobile font-size >= 16px: iOS Safari force-zooms into inputs below 16px. Do not lower.
                className="w-full resize-none rounded-xl border border-hairline bg-white px-2.5 py-2 text-ink text-[16px] md:text-[13px] leading-normal placeholder:text-ink/38 focus:outline-none focus:border-lightblue/55"
              />
            )}
            {sendError}
            <SendButton
              label={
                commentOpen && !comment.trim()
                  ? "Valider sans commentaire"
                  : "Valider"
              }
              pending={postSubmission.isPending}
              onClick={() => submit("approval")}
            />
            {!commentOpen && (
              <button
                type="button"
                onClick={() => setCommentOpen(true)}
                className="self-center inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12.5px] font-semibold text-deepblue/62 hover:text-deepblue hover:bg-deepblue/4 transition-colors"
              >
                <PlusIcon size={13} weight="bold" />
                Ajouter un commentaire
              </button>
            )}
          </>
        );

      case "fork":
        return (
          <>
            {sourceHost && (
              <p className="text-[12.5px] leading-normal text-deepblue/62">
                Ces horaires viennent de{" "}
                <a
                  href={churchDetails?.website?.home_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-deepblue font-semibold underline underline-offset-2 hover:text-deepblue/70"
                >
                  {sourceHost}
                </a>
                . Le site peut être en retard, ou mal lu par notre robot.
              </p>
            )}
            <Choice
              icon={<PlusIcon size={16} weight="bold" />}
              title="Compléter l'information"
              onClick={() => setStep("complete")}
            />
            <Choice
              icon={<WarningCircleIcon size={16} />}
              title="Signaler une erreur"
              onClick={() => setStep("report")}
            />
          </>
        );

      case "complete":
        return (
          <>
            {photoFile ? (
              <div className="w-full h-24 flex gap-2.5 items-center rounded-xl border border-hairline bg-white p-2">
                {photoPreviewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreviewUrl}
                    alt="Aperçu"
                    className="h-full aspect-square object-cover rounded-lg shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-deepblue truncate">
                    {photoFile.name}
                  </p>
                  <p className="tabular text-[11px] text-deepblue/55">
                    {(photoFile.size / 1048576).toFixed(1).replace(".", ",")} Mo
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoFile(null)}
                  aria-label="Retirer la photo"
                  className="shrink-0 w-8 h-8 rounded-full hover:bg-rose-600/8 flex items-center justify-center transition-colors"
                >
                  <XIcon size={16} weight="bold" className="text-rose-600" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full h-24 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-deepblue/25 hover:border-deepblue/40 hover:bg-deepblue/3 text-[12.5px] font-semibold text-deepblue/60 transition-colors"
              >
                <CameraIcon size={20} />
                Ajouter une photo
              </button>
            )}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                photoFile
                  ? "Une précision sur la photo ? (facultatif)"
                  : "Ex. : confessions les mardis et jeudis de 10h30 à 11h30 à l'église Sainte-Jeanne."
              }
              // Keep mobile font-size >= 16px: iOS Safari force-zooms into inputs below 16px. Do not lower.
              className="w-full h-24 resize-none rounded-xl border border-hairline bg-white px-2.5 py-2 text-ink text-[16px] md:text-[13px] leading-normal placeholder:text-ink/38 focus:outline-none focus:border-lightblue/55"
            />
            {photoErrorText}
            {validityPicker}
            {emailField}
            {sendError}
            <SendButton
              label="Envoyer mon complément"
              pending={postSubmission.isPending || postFileNote.isPending}
              disabled={!comment.trim() && !photoFile}
              onClick={() =>
                photoFile ? postFileNote.mutate() : submit("text_note")
              }
            />
          </>
        );

      case "report":
        return (
          <>
            <div className="flex flex-col gap-1">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex. : le lien Source pointe vers l'ancien site de la paroisse."
                rows={3}
                // Keep mobile font-size >= 16px: iOS Safari force-zooms into inputs below 16px. Do not lower.
                className="w-full resize-none rounded-xl border border-hairline bg-white px-2.5 py-2 text-ink text-[16px] md:text-[13px] leading-normal placeholder:text-ink/38 focus:outline-none focus:border-lightblue/55"
              />
              <p className="text-[11px] leading-snug text-deepblue/50">
                Affiché publiquement sous les horaires.
              </p>
            </div>
            {emailField}
            {sendError}
            <SendButton
              label="Envoyer mon signalement"
              pending={postSubmission.isPending}
              disabled={!comment.trim()}
              onClick={() => submit("issue")}
            />
          </>
        );

      case "sent-good":
        return (
          <Confirmation
            tone="done"
            title="Validé"
            detail="Compté immédiatement, sans modération."
            onDone={goRoot}
          />
        );

      case "sent-complement":
        return (
          <Confirmation
            tone="waiting"
            title="Complément envoyé"
            detail="En attente de vérification."
            onDone={goRoot}
          />
        );

      case "sent-report":
        return (
          <Confirmation
            tone="waiting"
            title="Signalement envoyé"
            detail="En attente de vérification."
            onDone={goRoot}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      <div className="flex flex-col items-center py-5 gap-3">
        <div className="w-full max-w-[320px] flex flex-col items-center gap-2.5">
          <p className="text-white/70 text-[13px] font-medium text-center">
            Retours de la communauté
          </p>
          <div className="flex gap-2 w-full">
            <button
              type="button"
              aria-label="Confirmer que ces horaires sont à jour"
              disabled={!canReport}
              aria-expanded={inValidateBranch}
              onClick={openValidate}
              className={[
                "flex-1 min-h-[52px] rounded-full border flex flex-col items-center justify-center gap-px px-2 py-1.5 transition-colors",
                inValidateBranch
                  ? "bg-emerald-300/12 border-emerald-300/50"
                  : "bg-white/7 border-white/14 hover:bg-white/12",
                !canReport && "opacity-40 cursor-not-allowed",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white/92">
                <CheckIcon
                  size={15}
                  weight="bold"
                  className="text-emerald-300 shrink-0"
                />
                Je valide
                <span className="tabular text-white/55">{upvotes}</span>
              </span>
              <span className="text-[10.5px] font-medium text-white/55">
                {lastGoodAt
                  ? `Confirmé le ${formatShortDay(lastGoodAt)}`
                  : "Soyez le premier !"}
              </span>
            </button>

            <button
              type="button"
              aria-label="Compléter l'information ou signaler une erreur"
              disabled={!canReport}
              aria-expanded={inAddBranch}
              onClick={openFork}
              className={[
                "flex-1 min-h-[52px] rounded-full border flex flex-col items-center justify-center gap-px px-2 py-1.5 transition-colors",
                inAddBranch
                  ? "bg-white/16 border-white/45"
                  : "bg-white/7 border-white/14 hover:bg-white/12",
                !canReport && "opacity-40 cursor-not-allowed",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white/92">
                <PlusIcon
                  size={15}
                  weight="bold"
                  className="text-white/75 shrink-0"
                />
                Je complète
              </span>
              <span className="text-[10.5px] font-medium text-white/55">
                ou je signale une erreur
              </span>
            </button>
          </div>
        </div>

        {step !== "root" && (
          <div
            ref={panelRef}
            className="w-full px-4"
            // Keyboard-height padding so the panel can sit fully above the iOS
            // keyboard once scrolled into view (see keyboardOverlap effect).
            style={{ paddingBottom: keyboardOverlap }}
          >
            <div className="bg-paper rounded-xl p-3 flex flex-col gap-2.5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.2)] motion-safe:animate-[fadeInUp_180ms_ease]">
              {panel()}
            </div>
          </div>
        )}
      </div>

      {step === "root" &&
        (liveEntries.length > 0 || archivedEntries.length > 0) && (
          <div className="px-4 pb-5 flex flex-col gap-2">
            {liveEntries.map((entry) => (
              <div
                key={entry.uuid}
                ref={entry.uuid === replyTo ? replyRef : undefined}
                // Same keyboard padding as the top panel, see keyboardOverlap.
                style={
                  entry.uuid === replyTo
                    ? { paddingBottom: keyboardOverlap }
                    : undefined
                }
              >
                <EntryCard entry={entry}>
                  {canReport && (
                    <ReplyControls
                      open={replyTo === entry.uuid}
                      sent={sentReplyTo === entry.uuid}
                      text={replyText}
                      pending={postReply.isPending}
                      failed={postReply.isError}
                      onToggle={() => toggleReply(entry.uuid)}
                      onChange={setReplyText}
                      onSend={() => submitReply(entry)}
                    />
                  )}
                </EntryCard>
              </div>
            ))}
            {archivedEntries.length > 0 && (
              <button
                type="button"
                onClick={() => setArchiveOpen(!archiveOpen)}
                aria-expanded={archiveOpen}
                className={[
                  "mt-1 w-full min-h-[44px] rounded-full border inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-white/92 transition-colors",
                  archiveOpen
                    ? "bg-white/16 border-white/45"
                    : "bg-white/7 border-white/14 hover:bg-white/12",
                ].join(" ")}
              >
                Anciens retours
                <span className="tabular text-white/55">
                  {archivedEntries.length}
                </span>
                {archiveOpen ? (
                  <CaretUpIcon size={13} weight="bold" className="text-white/55" />
                ) : (
                  <CaretDownIcon
                    size={13}
                    weight="bold"
                    className="text-white/55"
                  />
                )}
              </button>
            )}
            {archiveOpen &&
              archivedEntries.map((entry) => (
                <EntryCard key={entry.uuid} entry={entry} />
              ))}
          </div>
        )}
    </div>
  );
};

export { CommunityFeedback };
