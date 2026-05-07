// Episode Panel toolbar. Renders Sort, New Folder, and Clear Cache actions.
import { FaFolderPlus, FaSortAlphaDown, FaSortAlphaUp, FaTrashAlt } from "react-icons/fa";
import { TOOLTIPS, getSortTooltip } from "../../../utils/tooltips";

type EpisodePanelHeaderProps = {
  nextSortDirection: "asc" | "desc";
  setNextSortDirection: React.Dispatch<
    React.SetStateAction<"asc" | "desc">
  >;

  onSortEpisodePanel: (direction: "asc" | "desc") => void;
  openNewFolderModal: (parentFolderId: string | null) => void;
  openClearConfirmModal: () => void;
};

export default function EpisodePanelHeader({
  nextSortDirection,
  setNextSortDirection,
  onSortEpisodePanel,
  openNewFolderModal,
  openClearConfirmModal,
}: EpisodePanelHeaderProps) {
  const sortLabel = getSortTooltip(nextSortDirection);
  const SortIcon = nextSortDirection === "asc" ? FaSortAlphaDown : FaSortAlphaUp;

  return (
    <div className="episode-panel-header">
      <div className="episode-panel-title">Episode Panel</div>

      <div className="episode-panel-actions">
        <button
          type="button"
          className="episode-panel-action icon-only"
          onClick={() => {
            onSortEpisodePanel(nextSortDirection);

            setNextSortDirection((prev) =>
              prev === "asc" ? "desc" : "asc"
            );
          }}
          title={sortLabel}
          aria-label={sortLabel}
        >
          <SortIcon aria-hidden="true" />
        </button>

        <button
          type="button"
          className="episode-panel-action icon-only"
          onClick={() => openNewFolderModal(null)}
          title={TOOLTIPS.episodePanel.newFolder}
          aria-label={TOOLTIPS.episodePanel.newFolder}
        >
          <FaFolderPlus aria-hidden="true" />
        </button>

        <button
          type="button"
          className="episode-panel-action icon-only"
          onClick={openClearConfirmModal}
          title={TOOLTIPS.episodePanel.clearCache}
          aria-label={TOOLTIPS.episodePanel.clearCache}
        >
          <FaTrashAlt aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
