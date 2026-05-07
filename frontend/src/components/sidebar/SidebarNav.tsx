// Sidebar navigation buttons. Handles switching between top-level pages like Home and Menu
import type { IconType } from "react-icons";
import { FaBars, FaCog, FaHome } from "react-icons/fa";
import type { Page } from "./types";
import { useUIStateStore } from "../../stores/UIStore";
import Tooltip from "../common/Tooltip";
import { TOOLTIPS } from "../../utils/tooltips";

const buttons: { name: string; page: Page; icon: IconType; tooltip: string }[] = [
  { name: "Home", page: "home", icon: FaHome, tooltip: TOOLTIPS.sidebar.home },
  { name: "Menu", page: "menu", icon: FaBars, tooltip: TOOLTIPS.sidebar.menu },
  { name: "Settings", page: "settings", icon: FaCog, tooltip: TOOLTIPS.sidebar.settings },
];

export default function SidebarNav() {
  const activePage = useUIStateStore(s => s.activePage);
  const setActivePage = useUIStateStore(s => s.setActivePage);

  return (
    <div className="menu-buttons">
      {buttons.map((button) => {
        const Icon = button.icon;
        const isActive = activePage === button.page;

        return (
          <div className="sidebar-button" key={button.page}>
            <Tooltip label={button.tooltip} side="bottom" className="amv-tooltip--fill">
              <button
                type="button"
                className={`sidebar-nav-button${isActive ? " is-active" : ""}`}
                onClick={() => setActivePage(button.page)}
                disabled={isActive}
                aria-current={isActive ? "page" : undefined}
                aria-label={button.name}
              >
                <Icon aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}
