import { Link, useLocation } from "react-router-dom";

const iconPaths: Record<string, string> = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  workouts:
    "M3 10h2V7h3v10H5v-3H3v-4Zm18 0h-2V7h-3v10h3v-3h2v-4ZM9 11h6v2H9v-2Z",
  nutrition:
    "M12 3c-3 0-5 2.5-5 6 0 2.5 1.5 4.5 3 5.3V21h4v-6.7c1.5-.8 3-2.8 3-5.3 0-3.5-2-6-5-6Z",
  planner:
    "M12 2l1.8 4.6L18 8.4l-4.2 1.8L12 15l-1.8-4.8L6 8.4l4.2-1.8L12 2Zm6 11 1 2.5 2.5 1-2.5 1L18 20l-1-2.5-2.5-1 2.5-1L18 13ZM6 15l.8 2 2 .8-2 .8L6 21l-.8-2.4-2-.8 2-.8L6 15Z",
  progress: "M3 20h18v-2H3v2Zm2-4 4-5 4 3 6-8 1.6 1.2L13.4 17l-4-3-2.8 3.5L5 16Z",
  profile:
    "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5Z",
};

const tabs = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/workouts", label: "Workouts", icon: "workouts" },
  { to: "/nutrition", label: "Nutrition", icon: "nutrition" },
  { to: "/nutrition/meal-plan", label: "AI Meal Plan", icon: "planner" },
  { to: "/progress", label: "Progress", icon: "progress" },
  { to: "/profile", label: "Profile", icon: "profile" },
];

function isTabActive(pathname: string, to: string) {
  if (to === "/nutrition") {
    return pathname.startsWith("/nutrition") && !pathname.startsWith("/nutrition/meal-plan");
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function NavIcon({ name }: { name: string }) {
  return (
    <svg aria-hidden="true" className="nav-icon" fill="currentColor" viewBox="0 0 24 24">
      <path d={iconPaths[name] ?? iconPaths.dashboard} />
    </svg>
  );
}

export function AppNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Main" className="app-nav">
      <div className="app-nav-inner">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab.to);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`app-nav-link${active ? " is-active" : ""}`}
              key={tab.to}
              to={tab.to}
            >
              <NavIcon name={tab.icon} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
