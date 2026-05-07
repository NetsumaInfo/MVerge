import React from "react";
import { FiDownload } from "react-icons/fi";
import Tooltip from "../common/Tooltip";
import { TOOLTIPS } from "../../utils/tooltips";

type DownloadButtonProps = {
  onClick: (e: React.MouseEvent) => void;
  loading?: boolean;
  tone?: "light" | "dark";
};

/**
 * A small download button designed to sit on a clip tile.
 * Animated on hover for a premium feel.
 */
export const DownloadButton: React.FC<DownloadButtonProps> = ({ onClick, loading, tone = "light" }) => {
  return (
    <Tooltip label={TOOLTIPS.clips.download} side="left" disabled={loading}>
      <button
        className={`clip-download-btn ${loading ? "loading" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        disabled={loading}
      >
        <FiDownload className={`clip-download-icon download-tone-${tone}`} />
      </button>
    </Tooltip>
  );
};
