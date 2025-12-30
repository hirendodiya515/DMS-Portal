import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Settings,
  BarChart3,
  FileStack,
  Target,
  Shield,
  Briefcase,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  Circle,
  Network,
  GitBranch,
  GraduationCap,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";

export default function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Documents", href: "/documents", icon: FileText },
    { name: "Organization Chart", href: "/org-chart", icon: Network },
    { name: "Flowchart", href: "/flowchart", icon: GitBranch },
    { name: "Department", href: "/department", icon: Briefcase },
    { name: "Objectives", href: "/objectives", icon: Target },
    { name: "Risks", href: "/risks", icon: Shield },
    {
      name: "Competency & Training",
      icon: GraduationCap,
      children: [
        { name: "Gap Analysis", href: "/competency/dashboard" },
        { name: "Employees", href: "/competency/employees" },
        { name: "Job Roles", href: "/competency/roles" },
        { name: "Competencies", href: "/competency/master" },
        { name: "Training", href: "/competency/training" },
      ],
    },
    {
      name: "Internal Audit",
      icon: ClipboardCheck,
      children: [
        { name: "Audit Plan", href: "/internal-audit/plan" },
        { name: "Auditors / Auditees", href: "/internal-audit/auditors" },
        { name: "Schedule", href: "/internal-audit/schedule" },
        { name: "Audit Checksheet", href: "/internal-audit/checksheet" },
        { name: "Perform Audit", href: "/internal-audit/perform" },
        { name: "Summary", href: "/internal-audit/summary" },
        { name: "NC Tracking", href: "/internal-audit/nc-tracking" },
      ],
    },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Audit Logs", href: "/audit-logs", icon: FileStack },
    // Only show Settings (which includes Users) to Admin
    ...(user?.role === "admin"
      ? [{ name: "Settings", href: "/settings", icon: Settings }]
      : []),
  ];

  const isChildActive = (item: any) => {
    return item.children?.some(
      (child: any) => location.pathname === child.href
    );
  };

  return (
    <div className="w-20 hover:w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-in-out group shadow-2xl overflow-hidden pt-4">
      {/* Branding moved to Header, kept empty div or removed? Removed as per request to 'adjust' visibility issue. */}

      <nav className="flex-1 px-0 py-4 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {navigation.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <div>
                <button
                  onClick={() => toggleExpand(item.name)}
                  className={`w-full flex items-center justify-between pl-7 pr-4 py-3 transition-all duration-200 ${
                    isChildActive(item)
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 shrink-0">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                      {item.name}
                    </span>
                  </div>
                  {expandedItems.includes(item.name) ? (
                    <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  ) : (
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}
                </button>
                {expandedItems.includes(item.name) && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-700 pl-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.name}
                        to={child.href}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                            isActive
                              ? "text-blue-400 font-medium bg-slate-800/50"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                          }`
                        }
                      >
                        <Circle className="w-2 h-2 shrink-0" />
                        <span className="whitespace-nowrap">{child.name}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to={item.href!}
                className={({ isActive }) =>
                  `flex items-center gap-3 pl-7 pr-4 py-3 transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  {item.name}
                </span>
              </NavLink>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
