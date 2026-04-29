import premiereIcon from "../../assets/editor-icons/adobepremierepro.svg";
import afterEffectsIcon from "../../assets/editor-icons/adobeaftereffects.svg";
import davinciIcon from "../../assets/editor-icons/davinciresolve.svg";
import { FaCode, FaCodeBranch, FaFilm, FaLayerGroup, FaVideo } from "react-icons/fa";
import { type ComponentType } from "react";
import { type ExportProfileIconKey } from "../../settings/generalSettings";

type ExportProfileIconProps = {
  icon: ExportProfileIconKey;
  className?: string;
  title?: string;
};

const EDITOR_ICON_MAP: Record<string, string> = {
  premiere: premiereIcon,
  after_effects: afterEffectsIcon,
  davinci_resolve: davinciIcon,
};

const ICON_GLYPH_MAP: Record<Exclude<ExportProfileIconKey, "premiere" | "after_effects" | "davinci_resolve">, ComponentType<{ className?: string }>> = {
  h264: FaVideo,
  h265: FaVideo,
  dnxhd_dnxhr: FaLayerGroup,
  prores: FaFilm,
  xml: FaCode,
  timeline: FaCodeBranch,
};

export default function ExportProfileIcon({ icon, className = "", title }: ExportProfileIconProps) {
  const editorIcon = EDITOR_ICON_MAP[icon];

  if (editorIcon) {
    return (
      <span className={`export-profile-icon ${className}`} title={title}>
        <img src={editorIcon} alt={title || icon} className="export-profile-icon-image" />
      </span>
    );
  }

  const Glyph = ICON_GLYPH_MAP[icon as keyof typeof ICON_GLYPH_MAP] || FaVideo;

  return (
    <span className={`export-profile-icon export-profile-icon-glyph ${icon} ${className}`} title={title}>
      <Glyph className="export-profile-glyph-svg" />
    </span>
  );
}
