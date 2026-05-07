// Sidebar navigation buttons. Handles switching between top-level pages like Home and Menu
import type { IconType } from "react-icons";
import { FaBars, FaCog, FaHome } from "react-icons/fa";
import type { Page } from "./types";
import { useUIStateStore } from "../../stores/UIStore";
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
            <button
              type="button"
              className={`sidebar-nav-button${isActive ? " is-active" : ""}`}
              onClick={() => setActivePage(button.page)}
              disabled={isActive}
              aria-current={isActive ? "page" : undefined}
              aria-label={button.name}
              title={button.tooltip}
            >
              <Icon aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
