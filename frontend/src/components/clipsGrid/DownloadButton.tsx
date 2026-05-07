import React from "react";
import { FiDownload } from "react-icons/fi";
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
    <button
      className={`clip-download-btn ${loading ? "loading" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      title={TOOLTIPS.clips.download}
      disabled={loading}
    >
      <FiDownload className={`clip-download-icon download-tone-${tone}`} />
    </button>
  );
};
