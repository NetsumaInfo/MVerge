const STORAGE_KEY = "amverge.generalSettings.v2"

export const EXPORT_FORMAT_OPTIONS = ["mp4", "mkv", "mov", "avi", "xml"] as const;
export type ExportFormat = (typeof EXPORT_FORMAT_OPTIONS)[number];

export const EXPORT_CODEC_OPTIONS = ["h264", "h265", "dnxhd_dnxhr", "prores"] as const;
export type ExportCodec = (typeof EXPORT_CODEC_OPTIONS)[number];

export const EDITOR_TARGET_OPTIONS = ["premiere", "after_effects", "davinci_resolve"] as const;
export type EditorTarget = (typeof EDITOR_TARGET_OPTIONS)[number];

export const EXPORT_WORKFLOW_OPTIONS = [
    "video_files",
    "video_and_editor",
    "xml_timeline",
    "original_cut_to_editor",
] as const;
export type ExportWorkflow = (typeof EXPORT_WORKFLOW_OPTIONS)[number];

export const EXPORT_PROFILE_ICON_OPTIONS = [
    { value: "h264", label: "H.264" },
    { value: "h265", label: "H.265" },
    { value: "dnxhd_dnxhr", label: "DNxHD / DNxHR" },
    { value: "prores", label: "ProRes" },
    { value: "xml", label: "XML" },
    { value: "timeline", label: "Timeline" },
    { value: "premiere", label: "Premiere Pro" },
    { value: "after_effects", label: "After Effects" },
    { value: "davinci_resolve", label: "DaVinci Resolve" },
] as const;

export type ExportProfileIconKey = (typeof EXPORT_PROFILE_ICON_OPTIONS)[number]["value"];

export type ExportProfile = {
    id: string;
    name: string;
    icon: ExportProfileIconKey;
    workflow: ExportWorkflow;
    editorTarget: EditorTarget;
    format: ExportFormat;
    codec: ExportCodec;
    codecProfile: string;
    mergeClips: boolean;
};

export const EXPORT_CODEC_LABELS: Record<ExportCodec, string> = {
    h264: "H.264",
    h265: "H.265",
    dnxhd_dnxhr: "DNxHD / DNxHR",
    prores: "ProRes",
};

export const EXPORT_WORKFLOW_LABELS: Record<ExportWorkflow, string> = {
    video_files: "Export Video Files",
    video_and_editor: "Export + Send To Editor",
    xml_timeline: "Export XML Timeline",
    original_cut_to_editor: "Send Original Cut To Editor",
};

export const EDITOR_TARGET_LABELS: Record<EditorTarget, string> = {
    premiere: "Premiere Pro",
    after_effects: "After Effects",
    davinci_resolve: "DaVinci Resolve",
};

export const EXPORT_CODEC_PROFILE_OPTIONS: Record<ExportCodec, { value: string; label: string }[]> = {
    h264: [
        { value: "baseline", label: "Baseline (max compatibility)" },
        { value: "main", label: "Main (balanced)" },
        { value: "high", label: "High (best H.264 quality)" },
    ],
    h265: [
        { value: "main", label: "Main (8-bit)" },
        { value: "main10", label: "Main 10 (10-bit)" },
    ],
    dnxhd_dnxhr: [
        { value: "dnxhd_36", label: "DNxHD 36 (proxy)" },
        { value: "dnxhd_145", label: "DNxHD 145" },
        { value: "dnxhd_220", label: "DNxHD 220" },
        { value: "dnxhr_lb", label: "DNxHR LB (low bitrate)" },
        { value: "dnxhr_sq", label: "DNxHR SQ (standard)" },
        { value: "dnxhr_hq", label: "DNxHR HQ (high quality)" },
        { value: "dnxhr_hqx", label: "DNxHR HQX (10-bit)" },
        { value: "dnxhr_444", label: "DNxHR 444 (finishing)" },
    ],
    prores: [
        { value: "proxy", label: "ProRes Proxy" },
        { value: "lt", label: "ProRes LT" },
        { value: "422", label: "ProRes 422" },
        { value: "422hq", label: "ProRes 422 HQ" },
        { value: "4444", label: "ProRes 4444" },
        { value: "4444xq", label: "ProRes 4444 XQ" },
    ],
};

export const EXPORT_CODEC_FORMAT_OPTIONS: Record<ExportCodec, ExportFormat[]> = {
    h264: ["mp4", "mkv", "mov", "avi"],
    h265: ["mp4", "mkv", "mov", "avi"],
    dnxhd_dnxhr: ["mov"],
    prores: ["mov"],
};

export type GeneralSettings = {
    episodesPath: string | null;
    audioPlaybackHover: boolean;
    playbackVolume: number;
    enableDiscordRPC: boolean;
    rpcShowFilename: boolean;
    rpcShowButtons: boolean;
    rpcShowMiniIcons: boolean;
    exportProfiles: ExportProfile[];
    activeExportProfileId: string;
};

function cloneProfile(profile: ExportProfile): ExportProfile {
    return { ...profile };
}

function profile(
    id: string,
    name: string,
    icon: ExportProfileIconKey,
    workflow: ExportWorkflow,
    format: ExportFormat,
    codec: ExportCodec,
    codecProfile: string,
    mergeClips: boolean,
    editorTarget: EditorTarget
): ExportProfile {
    return {
        id,
        name,
        icon,
        workflow,
        format,
        codec,
        codecProfile,
        mergeClips,
        editorTarget,
    };
}

function defaultExportProfiles(): ExportProfile[] {
    return [
        profile(
            "profile-h264-high",
            "H.264 High Quality",
            "h264",
            "video_files",
            "mp4",
            "h264",
            "high",
            true,
            "premiere"
        ),
        profile(
            "profile-h264-main",
            "H.264 Main Balanced",
            "h264",
            "video_files",
            "mp4",
            "h264",
            "main",
            true,
            "premiere"
        ),
        profile(
            "profile-h265-main",
            "H.265 Main",
            "h265",
            "video_files",
            "mp4",
            "h265",
            "main",
            true,
            "premiere"
        ),
        profile(
            "profile-h265-main10",
            "H.265 Main 10",
            "h265",
            "video_files",
            "mp4",
            "h265",
            "main10",
            true,
            "premiere"
        ),
        profile(
            "profile-dnxhr-hq",
            "DNxHR HQ",
            "dnxhd_dnxhr",
            "video_files",
            "mov",
            "dnxhd_dnxhr",
            "dnxhr_hq",
            true,
            "davinci_resolve"
        ),
        profile(
            "profile-dnxhr-hqx",
            "DNxHR HQX",
            "dnxhd_dnxhr",
            "video_files",
            "mov",
            "dnxhd_dnxhr",
            "dnxhr_hqx",
            true,
            "davinci_resolve"
        ),
        profile(
            "profile-prores-422",
            "ProRes 422",
            "prores",
            "video_files",
            "mov",
            "prores",
            "422",
            true,
            "premiere"
        ),
        profile(
            "profile-prores-422hq",
            "ProRes 422 HQ",
            "prores",
            "video_files",
            "mov",
            "prores",
            "422hq",
            true,
            "premiere"
        ),
        profile(
            "profile-pm-send",
            "Export + Send To Premiere",
            "premiere",
            "video_and_editor",
            "mp4",
            "h264",
            "high",
            true,
            "premiere"
        ),
        profile(
            "profile-xml-timeline",
            "XML Timeline",
            "xml",
            "xml_timeline",
            "xml",
            "h264",
            "high",
            false,
            "premiere"
        ),
        profile(
            "profile-davinci-original-cut",
            "Original Cut To DaVinci",
            "davinci_resolve",
            "original_cut_to_editor",
            "xml",
            "h264",
            "high",
            false,
            "davinci_resolve"
        ),
    ];
}

function deepCloneProfiles(profiles: ExportProfile[]): ExportProfile[] {
    return profiles.map(cloneProfile);
}

function isExportFormat(value: unknown): value is ExportFormat {
    return typeof value === "string" && EXPORT_FORMAT_OPTIONS.includes(value as ExportFormat);
}

function isExportCodec(value: unknown): value is ExportCodec {
    return typeof value === "string" && EXPORT_CODEC_OPTIONS.includes(value as ExportCodec);
}

function isEditorTarget(value: unknown): value is EditorTarget {
    return typeof value === "string" && EDITOR_TARGET_OPTIONS.includes(value as EditorTarget);
}

function isWorkflow(value: unknown): value is ExportWorkflow {
    return typeof value === "string" && EXPORT_WORKFLOW_OPTIONS.includes(value as ExportWorkflow);
}

function isIconKey(value: unknown): value is ExportProfileIconKey {
    return typeof value === "string" && EXPORT_PROFILE_ICON_OPTIONS.some((option) => option.value === value);
}

function fallbackCodecProfile(codec: ExportCodec): string {
    return EXPORT_CODEC_PROFILE_OPTIONS[codec][0]?.value ?? "high";
}

function coerceCodecProfile(codec: ExportCodec, value: unknown): string {
    const allowed = EXPORT_CODEC_PROFILE_OPTIONS[codec];
    if (typeof value !== "string") return fallbackCodecProfile(codec);
    return allowed.some((entry) => entry.value === value)
        ? value
        : fallbackCodecProfile(codec);
}

function coerceFormatForCodec(codec: ExportCodec, value: unknown): ExportFormat {
    const allowed = EXPORT_CODEC_FORMAT_OPTIONS[codec];
    if (isExportFormat(value) && allowed.includes(value)) {
        return value;
    }
    return allowed[0];
}

function sanitizeName(value: unknown, fallback: string): string {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 64) : fallback;
}

export function getDefaultProfileIcon(
    workflow: ExportWorkflow,
    editorTarget: EditorTarget,
    codec: ExportCodec
): ExportProfileIconKey {
    if (workflow === "xml_timeline") return "xml";
    if (workflow === "original_cut_to_editor") return editorTarget;
    if (workflow === "video_and_editor") return editorTarget;
    return codec;
}

function normalizeProfile(raw: unknown, index: number): ExportProfile | null {
    if (!raw || typeof raw !== "object") return null;

    const value = raw as Partial<ExportProfile> & {
        exportFormat?: ExportFormat;
    };

    const legacyFormat = isExportFormat((value as any).exportFormat)
        ? (value as any).exportFormat
        : undefined;

    const editorTarget: EditorTarget = isEditorTarget(value.editorTarget)
        ? value.editorTarget
        : "premiere";

    const codec: ExportCodec = isExportCodec(value.codec) ? value.codec : "h264";

    const inferredWorkflow: ExportWorkflow = isWorkflow(value.workflow)
        ? value.workflow
        : (value.format === "xml" || legacyFormat === "xml"
            ? "xml_timeline"
            : "video_files");

    const workflow: ExportWorkflow = inferredWorkflow;

    const codecProfile = coerceCodecProfile(codec, value.codecProfile);

    const format: ExportFormat = workflow === "xml_timeline"
        ? "xml"
        : coerceFormatForCodec(codec, value.format ?? legacyFormat);

    const fallbackName = `Custom Profile ${index + 1}`;
    const name = sanitizeName(value.name, fallbackName);

    const mergeClips = (workflow === "video_files" || workflow === "video_and_editor")
        ? (typeof value.mergeClips === "boolean" ? value.mergeClips : true)
        : false;

    const fallbackIcon = getDefaultProfileIcon(workflow, editorTarget, codec);
    const icon = isIconKey(value.icon) ? value.icon : fallbackIcon;

    return {
        id: typeof value.id === "string" && value.id.trim().length > 0
            ? value.id
            : `custom-profile-${index}`,
        name,
        icon,
        workflow,
        editorTarget,
        format,
        codec,
        codecProfile,
        mergeClips,
    };
}

function normalizeProfiles(
    rawProfiles: unknown,
    legacyFormat: unknown,
    activeId: unknown
): { profiles: ExportProfile[]; activeExportProfileId: string } {
    let profiles: ExportProfile[] = [];

    if (Array.isArray(rawProfiles)) {
        profiles = rawProfiles
            .map((entry, index) => normalizeProfile(entry, index))
            .filter((entry): entry is ExportProfile => entry !== null);
    }

    if (profiles.length === 0) {
        profiles = defaultExportProfiles();
        if (isExportFormat(legacyFormat) && legacyFormat !== "xml") {
            const first = profiles[0];
            const allowed = EXPORT_CODEC_FORMAT_OPTIONS[first.codec];
            profiles[0] = {
                ...first,
                format: allowed.includes(legacyFormat) ? legacyFormat : allowed[0],
            };
        }
    }

    const validIds = new Set(profiles.map((profile) => profile.id));
    const activeExportProfileId =
        typeof activeId === "string" && validIds.has(activeId)
            ? activeId
            : profiles[0].id;

    return {
        profiles,
        activeExportProfileId,
    };
}

export function buildDefaultGeneralSettings(): GeneralSettings {
    const profiles = defaultExportProfiles();
    return {
        episodesPath: null,
        audioPlaybackHover: true,
        playbackVolume: 0.2,
        enableDiscordRPC: true,
        rpcShowFilename: true,
        rpcShowButtons: true,
        rpcShowMiniIcons: true,
        exportProfiles: deepCloneProfiles(profiles),
        activeExportProfileId: profiles[0].id,
    };
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = buildDefaultGeneralSettings();

export function getCodecLabel(codec: ExportCodec): string {
    return EXPORT_CODEC_LABELS[codec] || "H.264";
}

export function getCodecProfileLabel(codec: ExportCodec, profile: string): string {
    const entry = EXPORT_CODEC_PROFILE_OPTIONS[codec].find((option) => option.value === profile);
    return entry?.label || profile;
}

export function getEditorTargetLabel(target: EditorTarget): string {
    return EDITOR_TARGET_LABELS[target] || "Premiere Pro";
}

export function getWorkflowLabel(workflow: ExportWorkflow): string {
    return EXPORT_WORKFLOW_LABELS[workflow] || "Export Video Files";
}

export function isVideoWorkflow(workflow: ExportWorkflow): boolean {
    return workflow === "video_files" || workflow === "video_and_editor";
}

export function requiresEditorWorkflow(workflow: ExportWorkflow): boolean {
    return workflow === "video_and_editor" || workflow === "original_cut_to_editor";
}

export function getActiveExportProfile(settings: GeneralSettings): ExportProfile {
    const found = settings.exportProfiles.find((profile) => profile.id === settings.activeExportProfileId);
    if (found) return found;

    const fallback = settings.exportProfiles[0];
    if (fallback) return fallback;

    return buildDefaultGeneralSettings().exportProfiles[0];
}

export function loadGeneralSettings(): GeneralSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return buildDefaultGeneralSettings();

        const parsed = JSON.parse(raw) as Partial<GeneralSettings> & {
            exportFormat?: ExportFormat;
        };

        const normalizedExport = normalizeProfiles(
            parsed.exportProfiles,
            parsed.exportFormat,
            parsed.activeExportProfileId
        );

        return {
            episodesPath: typeof parsed.episodesPath === "string" ? parsed.episodesPath : null,
            audioPlaybackHover:
                typeof parsed.audioPlaybackHover === "boolean"
                    ? parsed.audioPlaybackHover
                    : DEFAULT_GENERAL_SETTINGS.audioPlaybackHover,
            playbackVolume:
                typeof parsed.playbackVolume === "number"
                    ? parsed.playbackVolume
                    : DEFAULT_GENERAL_SETTINGS.playbackVolume,
            enableDiscordRPC:
                typeof parsed.enableDiscordRPC === "boolean"
                    ? parsed.enableDiscordRPC
                    : DEFAULT_GENERAL_SETTINGS.enableDiscordRPC,
            rpcShowFilename:
                typeof parsed.rpcShowFilename === "boolean"
                    ? parsed.rpcShowFilename
                    : DEFAULT_GENERAL_SETTINGS.rpcShowFilename,
            rpcShowButtons:
                typeof parsed.rpcShowButtons === "boolean"
                    ? parsed.rpcShowButtons
                    : DEFAULT_GENERAL_SETTINGS.rpcShowButtons,
            rpcShowMiniIcons:
                typeof parsed.rpcShowMiniIcons === "boolean"
                    ? parsed.rpcShowMiniIcons
                    : DEFAULT_GENERAL_SETTINGS.rpcShowMiniIcons,
            exportProfiles: deepCloneProfiles(normalizedExport.profiles),
            activeExportProfileId: normalizedExport.activeExportProfileId,
        };
    } catch {
        return buildDefaultGeneralSettings();
    }
}

export function saveGeneralSettings(next: GeneralSettings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
