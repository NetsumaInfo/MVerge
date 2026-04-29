import Dropdown, { type DropdownOption } from "../common/Dropdown";
import ExportProfileIcon from "../common/ExportProfileIcon";
import {
  EDITOR_TARGET_OPTIONS,
  EXPORT_CODEC_FORMAT_OPTIONS,
  EXPORT_CODEC_OPTIONS,
  EXPORT_CODEC_PROFILE_OPTIONS,
  EXPORT_FORMAT_OPTIONS,
  EXPORT_PROFILE_ICON_OPTIONS,
  EXPORT_WORKFLOW_OPTIONS,
  type ExportCodec,
  type ExportProfile,
  type ExportFormat,
  type ExportWorkflow,
  type GeneralSettings,
  getActiveExportProfile,
  getCodecLabel,
  getCodecProfileLabel,
  getDefaultProfileIcon,
  getEditorTargetLabel,
  getWorkflowLabel,
  isVideoWorkflow,
  requiresEditorWorkflow,
} from "../../settings/generalSettings";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  mp4: "MP4",
  mkv: "MKV",
  mov: "MOV",
  avi: "AVI",
  xml: "XML",
};

type ExportSectionProps = {
  generalSettings: GeneralSettings;
  setGeneralSettings: React.Dispatch<React.SetStateAction<GeneralSettings>>;
};

type ProfileDropdownOption = DropdownOption<string> & {
  icon: ExportProfile["icon"];
  meta: string;
};

function createProfileName(codec: ExportCodec, workflow: ExportWorkflow): string {
  if (workflow === "xml_timeline") return "XML Timeline";
  if (workflow === "original_cut_to_editor") return "Original Cut To Editor";
  if (workflow === "video_and_editor") return "Export + Send To Editor";

  if (codec === "h265") return "Custom H.265";
  if (codec === "dnxhd_dnxhr") return "Custom DNx";
  if (codec === "prores") return "Custom ProRes";
  return "Custom H.264";
}

function buildNewProfile(): ExportProfile {
  const id = crypto.randomUUID();
  const defaultCodecProfile =
    EXPORT_CODEC_PROFILE_OPTIONS.h264.find((entry) => entry.value === "high")?.value ??
    EXPORT_CODEC_PROFILE_OPTIONS.h264[0].value;

  return {
    id,
    name: "New Profile",
    icon: "h264",
    workflow: "video_files",
    editorTarget: "premiere",
    format: "mp4",
    codec: "h264",
    codecProfile: defaultCodecProfile,
    mergeClips: true,
  };
}

export default function ExportSection({
  generalSettings,
  setGeneralSettings,
}: ExportSectionProps) {
  const activeProfile = getActiveExportProfile(generalSettings);

  const profileMeta = (profile: ExportProfile): string => {
    if (!isVideoWorkflow(profile.workflow)) {
      if (profile.workflow === "xml_timeline") {
        return "Final Cut XML timeline export";
      }
      return `Original cut to ${getEditorTargetLabel(profile.editorTarget)}`;
    }

    const codec = getCodecLabel(profile.codec);
    const codecProfile = getCodecProfileLabel(profile.codec, profile.codecProfile);
    const base = `${codec} / ${codecProfile} / ${FORMAT_LABELS[profile.format]}`;
    if (profile.workflow === "video_and_editor") {
      return `${base} -> ${getEditorTargetLabel(profile.editorTarget)}`;
    }
    return base;
  };

  const profileDropdownOptions: ProfileDropdownOption[] = generalSettings.exportProfiles.map((profile) => ({
    value: profile.id,
    label: profile.name,
    icon: profile.icon,
    meta: profileMeta(profile),
  }));

  const updateActiveProfile = (mutate: (profile: ExportProfile) => ExportProfile) => {
    setGeneralSettings((prev) => ({
      ...prev,
      exportProfiles: prev.exportProfiles.map((profile) =>
        profile.id === prev.activeExportProfileId ? mutate(profile) : profile
      ),
    }));
  };

  const addProfile = () => {
    setGeneralSettings((prev) => {
      const next = buildNewProfile();
      return {
        ...prev,
        exportProfiles: [...prev.exportProfiles, next],
        activeExportProfileId: next.id,
      };
    });
  };

  const deleteProfile = () => {
    setGeneralSettings((prev) => {
      if (prev.exportProfiles.length <= 1) {
        return prev;
      }

      const filtered = prev.exportProfiles.filter(
        (profile) => profile.id !== prev.activeExportProfileId
      );

      return {
        ...prev,
        exportProfiles: filtered,
        activeExportProfileId: filtered[0].id,
      };
    });
  };

  const codecOptions = EXPORT_CODEC_OPTIONS.map((codec) => ({
    value: codec,
    label: getCodecLabel(codec),
  }));

  const workflowOptions = EXPORT_WORKFLOW_OPTIONS.map((workflow) => ({
    value: workflow,
    label: getWorkflowLabel(workflow),
  }));

  const editorTargetOptions = EDITOR_TARGET_OPTIONS.map((target) => ({
    value: target,
    label: getEditorTargetLabel(target),
  }));

  const codecProfileOptions = EXPORT_CODEC_PROFILE_OPTIONS[activeProfile.codec].map((entry) => ({
    value: entry.value,
    label: entry.label,
  }));

  const allowedFormats = EXPORT_CODEC_FORMAT_OPTIONS[activeProfile.codec];
  const formatOptions = EXPORT_FORMAT_OPTIONS
    .filter((format) => format !== "xml" && allowedFormats.includes(format))
    .map((format) => ({
      value: format,
      label: FORMAT_LABELS[format],
    }));

  const videoWorkflow = isVideoWorkflow(activeProfile.workflow);
  const needsEditorTarget = requiresEditorWorkflow(activeProfile.workflow);

  const renderProfileDropdownContent = (optionBase: DropdownOption<string> | undefined) => {
    const option = optionBase as ProfileDropdownOption | undefined;
    if (!option) return null;

    return (
      <div className="profile-dropdown-content">
        <ExportProfileIcon icon={option.icon} className="profile-dropdown-icon" />
        <span className="profile-dropdown-text">
          <span className="profile-dropdown-title">{option.label}</span>
          <span className="profile-dropdown-meta">{option.meta}</span>
        </span>
      </div>
    );
  };

  return (
    <section className="panel export-settings-panel">
      <h3>Export</h3>

      <div className="settings-row">
        <label className="settings-label">Active Profile</label>
        <div className="settings-control">
          <Dropdown
            className="settings-export-dropdown settings-profile-dropdown"
            options={profileDropdownOptions}
            value={activeProfile.id}
            renderValue={renderProfileDropdownContent}
            renderOption={(option) => renderProfileDropdownContent(option)}
            onChange={(value) =>
              setGeneralSettings((prev) => ({
                ...prev,
                activeExportProfileId: value,
              }))
            }
          />
        </div>
      </div>
      <p className="settings-help-line">
        Profile used by `Export Now` on the Home page.
      </p>

      <div className="export-profile-actions">
        <button className="buttons" type="button" onClick={addProfile}>
          New Profile
        </button>
        <button
          className="buttons"
          type="button"
          onClick={deleteProfile}
          disabled={generalSettings.exportProfiles.length <= 1}
        >
          Delete Active
        </button>
      </div>

      <div className="settings-row">
        <label className="settings-label">Profile Name</label>
        <div className="settings-control">
          <input
            className="settings-text-input"
            value={activeProfile.name}
            onChange={(e) => {
              const nextName = e.target.value.slice(0, 64);
              updateActiveProfile((profile) => ({
                ...profile,
                name: nextName.length > 0 ? nextName : createProfileName(profile.codec, profile.workflow),
              }));
            }}
          />
        </div>
      </div>
      <p className="settings-help-line">
        Display name shown in the export profile selector.
      </p>

      <div className="settings-row">
        <label className="settings-label">Profile Icon</label>
        <div className="settings-control">
          <span className="settings-icon-preview">
            <ExportProfileIcon icon={activeProfile.icon} />
          </span>
        </div>
      </div>
      <p className="settings-help-line">
        Visual icon used in the profile selector.
      </p>

      <div className="export-icon-presets">
        {EXPORT_PROFILE_ICON_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`export-icon-chip ${activeProfile.icon === option.value ? "active" : ""}`}
            onClick={() => {
              updateActiveProfile((profile) => ({
                ...profile,
                icon: option.value,
              }));
            }}
            title={option.label}
          >
            <ExportProfileIcon icon={option.value} />
          </button>
        ))}
      </div>

      <div className="settings-row">
        <label className="settings-label">Workflow</label>
        <div className="settings-control">
          <Dropdown
            className="settings-export-dropdown"
            options={workflowOptions}
            value={activeProfile.workflow}
            onChange={(workflow) => {
              updateActiveProfile((profile) => {
                const nextIcon = getDefaultProfileIcon(workflow, profile.editorTarget, profile.codec);
                const nextName = profile.name.trim().length > 0
                  ? profile.name
                  : createProfileName(profile.codec, workflow);

                if (workflow === "xml_timeline") {
                  return {
                    ...profile,
                    workflow,
                    icon: nextIcon,
                    name: nextName,
                    format: "xml",
                    mergeClips: false,
                  };
                }

                if (!isVideoWorkflow(workflow)) {
                  return {
                    ...profile,
                    workflow,
                    icon: nextIcon,
                    name: nextName,
                    mergeClips: false,
                  };
                }

                const allowed = EXPORT_CODEC_FORMAT_OPTIONS[profile.codec];
                return {
                  ...profile,
                  workflow,
                  icon: nextIcon,
                  name: nextName,
                  format: allowed.includes(profile.format) ? profile.format : allowed[0],
                  mergeClips: profile.mergeClips,
                };
              });
            }}
          />
        </div>
      </div>
      <p className="settings-help-line">
        Select export behavior: files, files + editor import, XML timeline, or original cut to editor.
      </p>

      {needsEditorTarget && (
        <>
          <div className="settings-row">
            <label className="settings-label">Send To</label>
            <div className="settings-control">
              <Dropdown
                className="settings-export-dropdown"
                options={editorTargetOptions}
                value={activeProfile.editorTarget}
                onChange={(editorTarget) => {
                  updateActiveProfile((profile) => ({
                    ...profile,
                    editorTarget,
                    icon: getDefaultProfileIcon(profile.workflow, editorTarget, profile.codec),
                  }));
                }}
              />
            </div>
          </div>
          <p className="settings-help-line">
            Target editor used for workflows that auto-send media or timelines.
          </p>
        </>
      )}

      {videoWorkflow && (
        <>
          <div className="settings-row">
            <label className="settings-label">Codec</label>
            <div className="settings-control">
              <Dropdown
                className="settings-export-dropdown"
                options={codecOptions}
                value={activeProfile.codec}
                onChange={(codec) => {
                  const firstProfile = EXPORT_CODEC_PROFILE_OPTIONS[codec][0].value;
                  const allowed = EXPORT_CODEC_FORMAT_OPTIONS[codec];
                  updateActiveProfile((profile) => ({
                    ...profile,
                    codec,
                    codecProfile: firstProfile,
                    format: allowed.includes(profile.format) ? profile.format : allowed[0],
                    icon: getDefaultProfileIcon(profile.workflow, profile.editorTarget, codec),
                    name: profile.name.trim().length > 0 ? profile.name : createProfileName(codec, profile.workflow),
                  }));
                }}
              />
            </div>
          </div>
          <p className="settings-help-line">
            Video codec used when exporting files.
          </p>

          <div className="settings-row">
            <label className="settings-label">Codec Profile</label>
            <div className="settings-control">
              <Dropdown
                className="settings-export-dropdown"
                options={codecProfileOptions}
                value={activeProfile.codecProfile}
                onChange={(codecProfile) => {
                  updateActiveProfile((profile) => ({
                    ...profile,
                    codecProfile,
                  }));
                }}
              />
            </div>
          </div>
          <p className="settings-help-line">
            Quality/compression profile for the selected codec.
          </p>

          <div className="settings-row">
            <label className="settings-label">Container</label>
            <div className="settings-control">
              <Dropdown
                className="settings-export-dropdown"
                options={formatOptions}
                value={activeProfile.format}
                onChange={(format) => {
                  updateActiveProfile((profile) => ({
                    ...profile,
                    format,
                  }));
                }}
              />
            </div>
          </div>
          <p className="settings-help-line">
            File format wrapper: MP4, MKV, MOV, or AVI.
          </p>

          <div className="settings-row">
            <label className="settings-label">Merge Clips</label>
            <div className="settings-control">
              <label className="custom-checkbox">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={activeProfile.mergeClips}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updateActiveProfile((profile) => ({
                      ...profile,
                      mergeClips: checked,
                    }));
                  }}
                />
                <span className="checkmark"></span>
              </label>
            </div>
          </div>
          <p className="settings-help-line">
            When enabled, selected clips are exported as one merged output file.
          </p>
        </>
      )}

    </section>
  );
}
