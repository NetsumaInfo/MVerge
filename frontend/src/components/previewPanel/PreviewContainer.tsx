import VideoPlayer from "./videoPlayer/VideoPlayer.tsx"
import HowToUse from "./HowToUse.tsx"
import React from "react";
import { FaFolderOpen, FaFileExport, FaFolder, FaRocket } from "react-icons/fa";
import {
  type GeneralSettings,
  getActiveExportProfile,
  getCodecLabel,
  getCodecProfileLabel,
  getEditorTargetLabel,
  isVideoWorkflow,
} from "../../settings/generalSettings";
import { type EditorTarget } from "../../hooks/useImportExport";
import Dropdown, { type DropdownOption } from "../common/Dropdown";
import ExportProfileIcon from "../common/ExportProfileIcon";

type PreviewContainerProps = {
  focusedClip: string | null;
  focusedClipThumbnail: string | null;
  selectedClips: Set<string>;
  videoIsHEVC: boolean | null;
  userHasHEVC: React.RefObject<boolean>;
  importToken: string;
  handleExport: (
    selectedClips: Set<string>,
    enableMerged: boolean,
    mergeFileName?: string,
    editorTarget?: EditorTarget
  ) => Promise<void>;
  handleExportOriginal: (
    selectedClips: Set<string>,
    editorTarget?: EditorTarget
  ) => Promise<void>;
  exportDir: string | null;
  onPickExportDir: () => void;
  onExportDirChange: (dir: string) => void;
  defaultMergedName: string;
  generalSettings: GeneralSettings;
  setGeneralSettings: React.Dispatch<React.SetStateAction<GeneralSettings>>;
};

type ProfileDropdownOption = DropdownOption<string> & {
  icon: ReturnType<typeof getActiveExportProfile>["icon"];
  meta: string;
};

export default function PreviewContainer (props: PreviewContainerProps) {
  const [showMergeNameModal, setShowMergeNameModal] = React.useState(false);
  const mergeNameInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeProfile = getActiveExportProfile(props.generalSettings);
  const profileMeta = (profile: typeof activeProfile): string => {
    if (!isVideoWorkflow(profile.workflow)) {
      if (profile.workflow === "xml_timeline") {
        return "Final Cut XML timeline export";
      }
      return `Original cut to ${getEditorTargetLabel(profile.editorTarget)}`;
    }

    const codec = getCodecLabel(profile.codec);
    const codecProfile = getCodecProfileLabel(profile.codec, profile.codecProfile);
    const base = `${codec} / ${codecProfile} / ${profile.format.toUpperCase()}`;
    if (profile.workflow === "video_and_editor") {
      return `${base} -> ${getEditorTargetLabel(profile.editorTarget)}`;
    }
    return base;
  };

  const profileOptions: ProfileDropdownOption[] = props.generalSettings.exportProfiles.map((profile) => ({
    value: profile.id,
    label: profile.name,
    icon: profile.icon,
    meta: profileMeta(profile),
  }));

  React.useEffect(() => {
    if (showMergeNameModal) {
      requestAnimationFrame(() => {
        mergeNameInputRef.current?.focus();
        mergeNameInputRef.current?.select();
      });
    }
  }, [showMergeNameModal]);

  const videoWorkflow = isVideoWorkflow(activeProfile.workflow);

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

  const onExportClick = () => {
    if (videoWorkflow && activeProfile.mergeClips) {
      setShowMergeNameModal(true);
      return;
    }

    props.handleExport(props.selectedClips, false);
  };

  const confirmMergeExport = () => {
    const value = (mergeNameInputRef.current?.value ?? "").trim();
    if (!value) return;
    setShowMergeNameModal(false);
    props.handleExport(props.selectedClips, true, value);
  };

  return (
    <main  className="preview-container" >
      <div className="preview-window">
        {props.focusedClip ? (
          <VideoPlayer
           selectedClip={props.focusedClip}
           videoIsHEVC={props.videoIsHEVC}
           userHasHEVC={props.userHasHEVC}
           posterPath={props.focusedClipThumbnail}
           importToken={props.importToken}
          />
          ) : (
            <p>No clip selected</p>
        )}
      </div>

      <div className="export-panel">
        <div className="export-header">
          <FaFileExport className="header-icon" />
          <span className="export-title">EXPORT PROFILE</span>
        </div>

        <div className="export-setting-group">
          <label className="export-label">Profile</label>
          <Dropdown
            className="export-profile-select preview-profile-dropdown"
            options={profileOptions}
            value={activeProfile.id}
            renderValue={renderProfileDropdownContent}
            renderOption={(option) => renderProfileDropdownContent(option)}
            onChange={(value) =>
              props.setGeneralSettings((prev) => ({
                ...prev,
                activeExportProfileId: value,
              }))
            }
          />
        </div>

        <div className="export-path-section">
          <label className="export-label">
            <FaFolder className="label-icon" /> Output Directory
          </label>
          <div className="export-dir-row">
            <input
              type="text"
              className="export-dir-input"
              placeholder="Select destination..."
              value={props.exportDir || ""}
              onChange={(e) => props.onExportDirChange(e.target.value)}
            />
            <button
              className="buttons export-dir-browse"
              onClick={props.onPickExportDir}
              title="Browse for output folder"
            >
              <FaFolderOpen />
            </button>
          </div>
        </div>

        <button
          className="buttons export-main-button"
          id="file-button"
          onClick={onExportClick}
        >
          <FaRocket className="btn-icon" /> Export Now
        </button>
      </div>

      <HowToUse/>

      {showMergeNameModal && (
        <div
          className="episode-modal-overlay"
          onMouseDown={() => setShowMergeNameModal(false)}
        >
          <div
            className="episode-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="episode-modal-title">Merged file name</div>
            <input
              ref={mergeNameInputRef}
              className="episode-modal-input"
              placeholder="Enter file name..."
              defaultValue={props.defaultMergedName}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowMergeNameModal(false);
                if (e.key === "Enter") confirmMergeExport();
              }}
            />
            <div className="episode-modal-actions">
              <button
                type="button"
                className="episode-modal-btn"
                onClick={() => setShowMergeNameModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="episode-modal-btn primary"
                onClick={confirmMergeExport}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
