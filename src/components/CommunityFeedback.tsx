import { components } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";
import { APP_TIME_ZONE, fetchApi } from "@/utils";
import { useKeyboardOverlap } from "@/hooks/useKeyboardOverlap";
import { useSheetRef } from "./ModalSheet/SheetContext";
import {
  CameraIcon,
  CaretRightIcon,
  CheckIcon,
  CircleNotchIcon,
  ClockIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";

type ChurchDetails = components["schemas"]["ChurchDetails"];
type ReportOut = components["schemas"]["ReportOut"];
type FeedbackType = components["schemas"]["FeedbackTypeEnum"];

// `valid_until` and `email` are not in the generated schema yet — the backend
// accepts the rest of the payload and drops them. Nothing in the UI claims an
// expiry date until /reports returns one, so a dropped field is invisible
// rather than wrong. Remove this extension once `ReportIn` carries both.
type ReportPayload = components["schemas"]["ReportIn"] & {
  valid_until?: string | null;
  email?: string | null;
};

type Step =
  | "root"
  | "validate"
  | "fork"
  | "complete"
  | "report"
  | "sent-good"
  | "sent-complement"
  | "sent-report";

type Validity = "week" | "month" | "year";

const VALIDITY: { key: Validity; label: string; days: number }[] = [
  { key: "week", label: "1 semaine", days: 7 },
  { key: "month", label: "1 mois", days: 30 },
  { key: "year", label: "1 an", days: 365 },
];

const KIND_LABELS: Record<FeedbackType, string> = {
  good: "Validation",
  comment: "Complément",
  error: "Signalement",
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

type CommentNode = {
  comment: string;
  created_at: string;
  feedback_type: FeedbackType;
  children: CommentNode[];
};

type LogEntry = {
  node: CommentNode;
  createdAt: string | null;
  image: string | null;
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

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  });

const formatShortDay = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: APP_TIME_ZONE,
  });

const validUntilISO = (validity: Validity) => {
  const entry = VALIDITY.find((v) => v.key === validity)!;
  const date = new Date();
  date.setDate(date.getDate() + entry.days);
  return date.toISOString();
};

const Replies = ({ nodes }: { nodes: CommentNode[] }) => (
  <div className="mt-2.5 pl-3 border-l border-ink/15 flex flex-col gap-2">
    {nodes.map((child, i) => (
      <div key={i} className="flex flex-col gap-0.5">
        <span className="tabular text-deepblue/50 text-[11px] font-medium">
          {formatDay(child.created_at)}
        </span>
        <p className="text-ink text-[12.5px] leading-normal whitespace-pre-line [overflow-wrap:anywhere]">
          {renderCommentBody(child.comment)}
        </p>
        {child.children.length > 0 && <Replies nodes={child.children} />}
      </div>
    ))}
  </div>
);

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
  const [email, setEmail] = useState("");
  const [validity, setValidity] = useState<Validity>("month");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { upvotes, lastGoodAt, entries } = useMemo(() => {
    const reports = churchDetails?.website?.reports ?? [];
    let up = 0;
    let latestGood: string | null = null;

    const walk = (list: ReportOut[]) => {
      for (const r of list) {
        if (r.feedback_type === "good") {
          up++;
          if (!latestGood || r.created_at > latestGood)
            latestGood = r.created_at;
        }
        walk(r.sub_reports);
      }
    };
    walk(reports);

    const build = (list: ReportOut[]): CommentNode[] => {
      const result: CommentNode[] = [];
      for (const r of list) {
        const children = build(r.sub_reports);
        if (r.comment) {
          result.push({
            comment: r.comment,
            created_at: r.created_at,
            feedback_type: r.feedback_type,
            children,
          });
        } else {
          result.push(...children);
        }
      }
      return result;
    };

    const images = churchDetails?.website?.images ?? [];
    const sourceImageUrls = new Set(
      (churchDetails?.parsings ?? [])
        .map((p) => p.image_url)
        .filter((url): url is string => !!url),
    );

    // `ImageOut` carries no timestamp, so photos cannot be dated or
    // interleaved with the reports — they follow them, undated.
    const list: LogEntry[] = [
      ...build(reports)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .map((node) => ({
          node,
          createdAt: node.created_at,
          image: null,
        })),
      ...images
        .filter((image) => !sourceImageUrls.has(image.public_url))
        .map((image) => ({
          node: {
            comment: image.comment ?? "",
            created_at: "",
            feedback_type: "comment" as FeedbackType,
            children: [] as CommentNode[],
          },
          createdAt: null,
          image: image.public_url,
        })),
    ];

    return { upvotes: up, lastGoodAt: latestGood, entries: list };
  }, [
    churchDetails?.website?.reports,
    churchDetails?.website?.images,
    churchDetails?.parsings,
  ]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const postReport = useMutation({
    mutationFn: async (payload: ReportPayload) =>
      fetchApi("/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({
        queryKey: ["churchDetails", church.uuid],
      });
      setStep(
        payload.feedback_type === "good"
          ? "sent-good"
          : payload.feedback_type === "error"
            ? "sent-report"
            : "sent-complement",
      );
    },
  });

  const postImage = useMutation({
    mutationFn: async () => {
      if (!websiteUuid) throw new Error("missing website uuid");
      if (!photoFile) throw new Error("missing file");
      const form = new FormData();
      form.append("website_uuid", websiteUuid);
      if (comment.trim()) form.append("comment", comment.trim());
      if (email.trim()) form.append("email", email.trim());
      form.append("valid_until", validUntilISO(validity));
      form.append("document", photoFile);
      // Do NOT set Content-Type — the browser sets the multipart boundary.
      return fetchApi("/images", {
        method: "POST",
        body: form,
      }) as Promise<components["schemas"]["ImageOut"]>;
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

  const resetDraft = () => {
    setComment("");
    setEmail("");
    setValidity("month");
    setPhotoFile(null);
    setPhotoError(null);
    postReport.reset();
    postImage.reset();
  };

  const goRoot = () => {
    setStep("root");
    resetDraft();
  };

  const submitReport = (feedback_type: FeedbackType) => {
    if (!websiteUuid) return;
    postReport.mutate({
      website_uuid: websiteUuid,
      church_uuid: church.uuid,
      feedback_type,
      error_type: null,
      comment: comment.trim() || null,
      email: email.trim() || null,
      valid_until: feedback_type === "comment" ? validUntilISO(validity) : null,
    });
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
    postImage.reset();
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
  const isFormStep =
    step === "validate" || step === "complete" || step === "report";
  const keyboardOverlap = useKeyboardOverlap(isFormStep);
  useEffect(() => {
    if (keyboardOverlap === 0) return;
    sheetRef?.current?.snapTo(0);
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [keyboardOverlap, sheetRef]);

  const inValidateBranch = step === "validate" || step === "sent-good";
  const inAddBranch =
    step !== "root" && step !== "validate" && step !== "sent-good";

  const isOpen = step !== "root";
  useEffect(() => {
    if (!isOpen) return;
    sheetRef?.current?.snapTo(0);
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
    posthog.capture("church_upvoted", {
      church_uuid: church.uuid,
      church_name: church.name,
    });
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
        {VALIDITY.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setValidity(v.key)}
            className={[
              "flex-1 rounded-full border py-1.5 text-[12px] font-semibold transition-colors",
              validity === v.key
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
    postReport.isError || postImage.isError ? (
      <p className="text-rose-600 text-[12px]">
        L&apos;envoi a échoué. Réessayez.
      </p>
    ) : null;

  const panel = () => {
    switch (step) {
      case "validate":
        return (
          <>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Commentaire (facultatif)"
              rows={2}
              // Keep mobile font-size >= 16px: iOS Safari force-zooms into inputs below 16px. Do not lower.
              className="w-full resize-none rounded-xl border border-hairline bg-white px-2.5 py-2 text-ink text-[16px] md:text-[13px] leading-normal placeholder:text-ink/38 focus:outline-none focus:border-lightblue/55"
            />
            {sendError}
            <SendButton
              label="Valider"
              pending={postReport.isPending}
              onClick={() => submitReport("good")}
            />
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
              pending={postReport.isPending || postImage.isPending}
              disabled={!comment.trim() && !photoFile}
              onClick={() =>
                photoFile ? postImage.mutate() : submitReport("comment")
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
              pending={postReport.isPending}
              disabled={!comment.trim()}
              onClick={() => submitReport("error")}
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

      {step === "root" && entries.length > 0 && (
        <div className="px-4 pb-5 flex flex-col gap-2">
          {entries.map(({ node, image, createdAt }, i) => (
            <div
              key={i}
              className="bg-paper rounded-xl px-3 py-2.5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.2)]"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <KindChip
                  label={image ? "Photo" : KIND_LABELS[node.feedback_type]}
                  tone={node.feedback_type === "error" ? "warn" : "neutral"}
                  icon={
                    image ? (
                      <CameraIcon size={11} />
                    ) : node.feedback_type === "error" ? (
                      <WarningCircleIcon size={11} weight="bold" />
                    ) : node.feedback_type === "good" ? (
                      <CheckIcon size={11} weight="bold" />
                    ) : (
                      <PlusIcon size={11} weight="bold" />
                    )
                  }
                />
                {createdAt && (
                  <span className="tabular ml-auto text-[10.5px] font-medium text-deepblue/50">
                    {formatShortDay(createdAt)}
                  </span>
                )}
              </div>
              {image ? (
                <div className="flex flex-col gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    // object-contain, never cover: these are photos of
                    // schedule boards, so cropping would eat the text.
                    alt="Photo des horaires"
                    loading="lazy"
                    className="w-full h-auto max-h-[240px] object-contain rounded-lg"
                  />
                  {node.comment && (
                    <p className="text-ink/70 text-[12px] leading-normal whitespace-pre-line [overflow-wrap:anywhere]">
                      {renderCommentBody(node.comment)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-ink text-[12.5px] leading-normal whitespace-pre-line [overflow-wrap:anywhere]">
                  {renderCommentBody(node.comment)}
                </p>
              )}
              {node.children.length > 0 && <Replies nodes={node.children} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { CommunityFeedback };
