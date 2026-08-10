import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Lightbulb, 
  Flag, 
  Sparkles, 
  ShieldAlert, 
  Compass, 
  ChevronDown, 
  ChevronRight, 
  Menu, 
  X,
  PlusCircle,
  FileText,
  CheckCircle,
  ClipboardList,
  Sliders,
  TrendingUp,
  UserCheck,
  AlertOctagon,
  Gauge
} from 'lucide-react';
import { UserPersona } from '../types';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (mod: any) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  persona: UserPersona;
  setPersona: (p: UserPersona) => void;
  openRedflagsCount: number;
  
  // Quick sub-action setters
  setInitialRedFlagAction: (act: string | null) => void;
  setInitialFiveSAction: (act: string | null) => void;
  setInitialSafetyAction: (act: string | null) => void;
  setInitialPpsrAction: (act: string | null) => void;

  // Mobile layout trigger
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function Sidebar({
  activeModule,
  setActiveModule,
  activeTab,
  setActiveTab,
  persona,
  setPersona,
  openRedflagsCount,
  setInitialRedFlagAction,
  setInitialFiveSAction,
  setInitialSafetyAction,
  setInitialPpsrAction,
  isMobileOpen,
  setIsMobileOpen
}: SidebarProps) {
  // Desktop collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Expanded state of individual submenus
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    kaizen: true,
    redflag: false,
    fives: false,
    safety: false,
    ppsr: false,
  });

  const toggleSubmenu = (menuKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const selectModule = (moduleKey: any) => {
    setActiveModule(moduleKey);
    // Auto-open submenu when selecting a module
    setExpandedMenus(prev => ({
      ...prev,
      [moduleKey]: true
    }));
    // Close mobile drawer on item click
    setIsMobileOpen(false);
  };

  const selectSubTab = (moduleKey: any, subTab: string, actionVal?: string) => {
    setActiveModule(moduleKey);
    if (moduleKey === 'kaizen') {
      setActiveTab(subTab as any);
    } else if (moduleKey === 'redflag') {
      setInitialRedFlagAction(actionVal || null);
    } else if (moduleKey === 'fives') {
      setInitialFiveSAction(actionVal || null);
    } else if (moduleKey === 'safety') {
      setInitialSafetyAction(actionVal || null);
    } else if (moduleKey === 'ppsr') {
      setInitialPpsrAction(actionVal || null);
    }
    setIsMobileOpen(false);
  };

  // Determine if sidebar is effectively expanded (either pinned expanded, or collapsed but hovered)
  const isExpanded = !isCollapsed || hovering;

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Component */}
      <aside
        onMouseEnter={() => isCollapsed && setHovering(true)}
        onMouseLeave={() => isCollapsed && setHovering(false)}
        className={`fixed md:sticky top-0 left-0 h-screen z-50 bg-slate-950 text-slate-300 border-r border-slate-800/80 flex flex-col transition-all duration-300 ${
          isMobileOpen 
            ? 'translate-x-0 w-64' 
            : 'max-md:-translate-x-full'
        } ${
          isExpanded ? 'w-64' : 'w-16'
        }`}
      >
        {/* Branding & Collapse Toggle */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white p-2 rounded-xl shadow-md flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            {isExpanded && (
              <div className="animate-fade-in flex flex-col">
                <span className="font-display font-black text-sm tracking-wider text-white uppercase">
                  SHOPFLOOR MS
                </span>
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider font-mono">
                  Master Hub
                </span>
              </div>
            )}
          </div>

          {/* Pin/Unpin Sidebar toggler (Desktop) */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition cursor-pointer"
            title={isCollapsed ? "Pin sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4 rotate-90" />
            )}
          </button>

          {/* Close mobile drawer */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          
          {/* Global Dashboard */}
          <div>
            <button
              onClick={() => selectModule('global-dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                activeModule === 'global-dashboard'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <LayoutDashboard className="w-4 h-4 shrink-0 text-indigo-400" />
                {isExpanded && <span className="truncate">SFMS Dashboard</span>}
              </div>
            </button>
          </div>

          <div className="pt-2 pb-1 border-t border-slate-900 my-2">
            {isExpanded && (
              <span className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">
                Modules & Registers
              </span>
            )}
          </div>

          {/* Kaizen Tracker */}
          <div className="space-y-1">
            <button
              onClick={() => selectModule('kaizen')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                activeModule === 'kaizen'
                  ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Lightbulb className="w-4 h-4 shrink-0 text-emerald-400" />
                {isExpanded && <span className="truncate">💡 Kaizen Tracker</span>}
              </div>
              {isExpanded && (
                <div 
                  onClick={(e) => toggleSubmenu('kaizen', e)}
                  className="p-0.5 hover:bg-slate-800 rounded transition"
                >
                  {expandedMenus.kaizen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              )}
            </button>

            {/* Kaizen Submenu */}
            {isExpanded && expandedMenus.kaizen && (
              <div className="pl-7 pr-1 py-1 space-y-1 border-l-2 border-slate-900 ml-5 animate-fade-in">
                <button
                  onClick={() => selectSubTab('kaizen', 'dashboard')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                    activeModule === 'kaizen' && activeTab === 'dashboard'
                      ? 'text-emerald-400 font-bold bg-slate-900/60'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                  }`}
                >
                  <Gauge className="w-3 h-3 shrink-0" />
                  <span>Overview Dashboard</span>
                </button>
                <button
                  onClick={() => selectSubTab('kaizen', 'list')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                    activeModule === 'kaizen' && activeTab === 'list'
                      ? 'text-emerald-400 font-bold bg-slate-900/60'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                  }`}
                >
                  <ClipboardList className="w-3 h-3 shrink-0" />
                  <span>Spreadsheet Register</span>
                </button>
                <button
                  onClick={() => selectSubTab('kaizen', 'form')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                    activeModule === 'kaizen' && activeTab === 'form'
                      ? 'text-emerald-400 font-bold bg-slate-900/60'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                  }`}
                >
                  <PlusCircle className="w-3 h-3 shrink-0" />
                  <span>👷 Log New Kaizen</span>
                </button>
                <button
                  onClick={() => selectSubTab('kaizen', 'committee')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition ${
                    activeModule === 'kaizen' && activeTab === 'committee'
                      ? 'text-emerald-400 font-bold bg-slate-900/60'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                  }`}
                >
                  <UserCheck className="w-3 h-3 shrink-0" />
                  <span>👥 Committee Review</span>
                </button>
              </div>
            )}
          </div>

          {/* Red Flags */}
          <div className="space-y-1">
            <button
              onClick={() => selectModule('redflag')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                activeModule === 'redflag'
                  ? 'bg-rose-600/15 text-rose-400 border border-rose-500/20'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Flag className="w-4 h-4 shrink-0 text-rose-500" />
                  {openRedflagsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  )}
                </div>
                {isExpanded && <span className="truncate">🚩 Red Flags</span>}
              </div>
              {isExpanded && (
                <div 
                  onClick={(e) => toggleSubmenu('redflag', e)}
                  className="p-0.5 hover:bg-slate-800 rounded transition"
                >
                  {expandedMenus.redflag ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              )}
            </button>

            {isExpanded && expandedMenus.redflag && (
              <div className="pl-7 pr-1 py-1 space-y-1 border-l-2 border-slate-900 ml-5 animate-fade-in">
                <button
                  onClick={() => selectSubTab('redflag', '', 'filter-all')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <ClipboardList className="w-3 h-3 shrink-0" />
                  <span>Register & Actions</span>
                </button>
                <button
                  onClick={() => selectSubTab('redflag', '', 'raise-modal')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <AlertOctagon className="w-3 h-3 shrink-0" />
                  <span>Raise Red Flag</span>
                </button>
              </div>
            )}
          </div>

          {/* 5S Auditing */}
          <div className="space-y-1">
            <button
              onClick={() => selectModule('fives')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                activeModule === 'fives'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
                {isExpanded && <span className="truncate">🧼 5S Auditing</span>}
              </div>
              {isExpanded && (
                <div 
                  onClick={(e) => toggleSubmenu('fives', e)}
                  className="p-0.5 hover:bg-slate-800 rounded transition"
                >
                  {expandedMenus.fives ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              )}
            </button>

            {isExpanded && expandedMenus.fives && (
              <div className="pl-7 pr-1 py-1 space-y-1 border-l-2 border-slate-900 ml-5 animate-fade-in">
                <button
                  onClick={() => selectSubTab('fives', '')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <ClipboardList className="w-3 h-3 shrink-0" />
                  <span>Audit Dashboard</span>
                </button>
                <button
                  onClick={() => selectSubTab('fives', '', 'log-audit')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <PlusCircle className="w-3 h-3 shrink-0" />
                  <span>New 5S Audit</span>
                </button>
              </div>
            )}
          </div>

          {/* Safety Desk */}
          <div className="space-y-1">
            <button
              onClick={() => selectModule('safety')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                activeModule === 'safety'
                  ? 'bg-amber-600/15 text-amber-400 border border-amber-500/20'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                {isExpanded && <span className="truncate">🛡️ Safety Desk</span>}
              </div>
              {isExpanded && (
                <div 
                  onClick={(e) => toggleSubmenu('safety', e)}
                  className="p-0.5 hover:bg-slate-800 rounded transition"
                >
                  {expandedMenus.safety ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              )}
            </button>

            {isExpanded && expandedMenus.safety && (
              <div className="pl-7 pr-1 py-1 space-y-1 border-l-2 border-slate-900 ml-5 animate-fade-in">
                <button
                  onClick={() => selectSubTab('safety', '')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <ClipboardList className="w-3 h-3 shrink-0" />
                  <span>EHS Log Register</span>
                </button>
                <button
                  onClick={() => selectSubTab('safety', '', 'report-hazard')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <PlusCircle className="w-3 h-3 shrink-0" />
                  <span>Report Hazard/Incident</span>
                </button>
              </div>
            )}
          </div>

          {/* PPSR (8D) */}
          <div className="space-y-1">
            <button
              onClick={() => selectModule('ppsr')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-xs font-bold tracking-wide uppercase ${
                activeModule === 'ppsr'
                  ? 'bg-violet-600/15 text-violet-400 border border-violet-500/20'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Compass className="w-4 h-4 shrink-0 text-violet-400" />
                {isExpanded && <span className="truncate">🧠 PPSR (8D)</span>}
              </div>
              {isExpanded && (
                <div 
                  onClick={(e) => toggleSubmenu('ppsr', e)}
                  className="p-0.5 hover:bg-slate-800 rounded transition"
                >
                  {expandedMenus.ppsr ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              )}
            </button>

            {isExpanded && expandedMenus.ppsr && (
              <div className="pl-7 pr-1 py-1 space-y-1 border-l-2 border-slate-900 ml-5 animate-fade-in">
                <button
                  onClick={() => selectSubTab('ppsr', '')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <ClipboardList className="w-3 h-3 shrink-0" />
                  <span>Practical Problem Solving</span>
                </button>
                <button
                  onClick={() => selectSubTab('ppsr', '', 'initiate-ppsr')}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
                >
                  <PlusCircle className="w-3 h-3 shrink-0" />
                  <span>Initiate New PPSR</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Persona quick switch panel at sidebar bottom (Very Enterprise!) */}
        {isExpanded && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950 shrink-0">
            <span className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-2 font-mono">
              ⚡ WORKSPACE PERSONA
            </span>
            <div className="grid grid-cols-1 gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setPersona('operator')}
                className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition ${
                  persona === 'operator'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <span>👷</span>
                <span className="truncate">Operator Console</span>
              </button>
              <button
                type="button"
                onClick={() => setPersona('committee')}
                className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition ${
                  persona === 'committee'
                    ? 'bg-indigo-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <span>👥</span>
                <span className="truncate">Committee Reviewer</span>
              </button>
              <button
                type="button"
                onClick={() => setPersona('manager')}
                className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition ${
                  persona === 'manager'
                    ? 'bg-blue-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <span>📊</span>
                <span className="truncate">Manager BI Desk</span>
              </button>
            </div>
          </div>
        )}

      </aside>
    </>
  );
}
