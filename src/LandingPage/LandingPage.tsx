import React, { useState } from 'react';
import { AuthUser, logout as authLogout } from '../utils/auth';
import { getRoleBadge, RoleCategory } from '../utils/rbac';
import { 
  BarChart3, 
  Boxes, 
  ShieldCheck, 
  Wrench, 
  Layers, 
  Lock, 
  ArrowRight, 
  LogOut, 
  Bell, 
  Settings, 
  HelpCircle, 
  CheckCircle2, 
  X,
  ExternalLink,
  Cpu,
  Activity
} from 'lucide-react';

interface LandingPageProps {
  currentUser?: AuthUser | null;
  onLaunchSFC: () => void;
  onLogout?: () => void;
}

export default function LandingPage({ currentUser, onLaunchSFC, onLogout }: LandingPageProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const userRole: RoleCategory = currentUser?.role_category || 'initiator';
  const roleBadge = getRoleBadge(userRole);

  const handleLogout = async () => {
    await authLogout();
    onLogout?.();
  };

  const showModuleNotice = (modName: string) => {
    setToastMessage(`Module "${modName}" is currently staged for deployment in the next release cycle.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  return (
    <div className="text-[#191b23] antialiased min-h-screen flex flex-col relative overflow-x-hidden bg-white selection:bg-[#4C7FFF]/20 selection:text-[#0652d2]">
      {/* Blueprint Grid Background Pattern */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #E2E8F0 1px, transparent 1px),
            linear-gradient(to bottom, #E2E8F0 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Orbit Background Motifs */}
      <div className="fixed w-[800px] h-[800px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#E2E8F0] pointer-events-none opacity-50 z-0" />
      <div className="fixed w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#CBD5E1] pointer-events-none opacity-40 z-0" />
      <div className="fixed w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dotted border-[#94A3B8] pointer-events-none opacity-30 z-0" />

      {/* Top Navigation Shell */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-[#E2E8F0] shadow-sm flex justify-between items-center w-full px-6 md:px-12 h-16 z-40 sticky top-0">
        {/* Left Branding */}
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0652d2] to-[#4C7FFF] flex items-center justify-center text-white shadow-md shadow-[#4C7FFF]/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[#0652d2] font-['Hanken_Grotesk']">
                KSPG Cockpit
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                ONLINE
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">
              Enterprise Module Gateway
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 font-mono text-xs font-semibold">
          <button 
            onClick={onLaunchSFC}
            className="text-[#0652d2] font-bold border-b-2 border-[#0652d2] pb-1 hover:text-[#0652d2] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>SFC Intelligence</span>
          </button>
          <button 
            onClick={() => showModuleNotice('Inventory Mgt.')}
            className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Inventory
          </button>
          <button 
            onClick={() => showModuleNotice('Quality & Metrology')}
            className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Quality
          </button>
          <button 
            onClick={() => showModuleNotice('TPM Maintenance')}
            className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Maintenance
          </button>
        </nav>

        {/* Right Controls & User Info */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* User Role Badge */}
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100/80 border border-slate-200 text-xs">
              <div className="w-6 h-6 rounded-full bg-[#0652d2] text-white flex items-center justify-center font-bold text-[11px]">
                {currentUser.full_name?.[0] || currentUser.username?.[0] || 'U'}
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="font-bold text-slate-800 text-[11px] truncate max-w-[110px]">
                  {currentUser.full_name || currentUser.username}
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  {roleBadge.label}
                </span>
              </div>
            </div>
          )}

          {/* Notifications button */}
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="font-mono text-xs text-[#0652d2] border border-[#0652d2]/40 bg-[#0652d2]/5 px-3 py-1.5 rounded-lg hover:bg-[#0652d2] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            title="System Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ALERTS</span>
          </button>

          {/* Help button */}
          <button 
            onClick={() => setShowHelp(true)}
            className="p-1.5 text-slate-400 hover:text-[#0652d2] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Help & Architecture Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Logout button */}
          <button 
            onClick={handleLogout}
            className="font-mono text-xs text-rose-600 border border-rose-200 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="End Session & Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">LOGOUT</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center relative z-10 px-6 md:px-12 py-10 md:py-16">
        
        {/* Hero Title */}
        <div className="text-center mb-10 md:mb-12 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0652d2]/10 border border-[#0652d2]/20 text-[#0652d2] font-mono text-[11px] font-bold uppercase tracking-widest mb-4">
            <Activity className="w-3 h-3 animate-spin text-[#0652d2]" />
            Enterprise Industrial Portal
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-['Hanken_Grotesk'] leading-tight">
            KSPG COCKPIT <span className="text-slate-300 font-light mx-1 md:mx-2">//</span> SELECT MODULE
          </h1>
          <p className="mt-3 text-slate-600 text-sm md:text-base font-normal max-w-xl mx-auto">
            Choose an authorized industrial application module to initialize secure, synchronized operations.
          </p>
        </div>

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1200px] w-full">
          
          {/* Module Card 1: SFC Intelligence (ACTIVE) */}
          <div className="bg-white/90 backdrop-blur-xl p-6 relative group flex flex-col h-full rounded-xl border-2 border-[#4C7FFF] shadow-[0_12px_40px_rgba(76,127,255,0.18)] hover:shadow-[0_16px_48px_rgba(76,127,255,0.25)] transition-all duration-300 hover:-translate-y-1">
            {/* HUD Corner Brackets */}
            <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#0652d2]" />
            <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#0652d2]" />
            <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-bottom-2 border-l-2 border-[#0652d2]" style={{ borderBottom: '2px solid #0652d2', borderLeft: '2px solid #0652d2' }} />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-bottom-2 border-r-2 border-[#0652d2]" style={{ borderBottom: '2px solid #0652d2', borderRight: '2px solid #0652d2' }} />

            <div className="flex justify-between items-start mb-4 border-b border-[#E2E8F0] pb-4">
              <div>
                <span className="font-mono text-[10px] font-bold text-[#0652d2] bg-[#0652d2]/10 px-2.5 py-1 rounded border border-[#0652d2]/20 mb-2 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0652d2] animate-ping" />
                  ACTIVE MODULE • READY
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-['Hanken_Grotesk'] mt-1">
                  SFC Intelligence
                </h2>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0652d2]/10 text-[#0652d2] group-hover:bg-[#0652d2] group-hover:text-white transition-colors duration-300">
                <BarChart3 className="w-7 h-7" />
              </div>
            </div>

            <p className="text-slate-600 text-sm flex-grow mb-6 leading-relaxed">
              Integrated Kaizen, PPSR 8D Problem Solving, 5S Audits, Safety Incident Tracking &amp; Shop Floor Control Intelligence Platform with real-time analytics.
            </p>

            <button 
              id="launch-sfc-btn"
              onClick={onLaunchSFC}
              className="w-full py-3.5 font-mono text-xs font-bold uppercase tracking-wider rounded-lg bg-[#4C7FFF] hover:bg-[#366cec] active:bg-[#0652d2] text-white shadow-md shadow-[#4C7FFF]/30 flex justify-center items-center gap-2 transition-all transform group-hover:translate-x-0.5 cursor-pointer"
            >
              <span>LAUNCH SEQUENCE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Module Card 2: Inventory Management */}
          <div className="bg-white/80 backdrop-blur-xl p-6 relative flex flex-col h-full rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
            <div className="flex justify-between items-start mb-4 border-b border-[#E2E8F0] pb-4">
              <div>
                <span className="font-mono text-[10px] font-bold text-slate-500 px-2 py-1 rounded border border-slate-300 border-dashed mb-2 inline-block">
                  [MOD-02] • STAGING
                </span>
                <h2 className="text-xl font-bold text-slate-800 font-['Hanken_Grotesk'] mt-1">
                  Inventory Mgt.
                </h2>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500">
                <Boxes className="w-7 h-7" />
              </div>
            </div>

            <p className="text-slate-500 text-sm flex-grow mb-6 leading-relaxed">
              Global stock tracking, Kanban card automated reordering algorithms, and warehouse spatial mapping across storage tiers.
            </p>

            <button 
              onClick={() => showModuleNotice('Inventory Management')}
              className="w-full py-3 font-mono text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex justify-center items-center gap-2 cursor-pointer"
            >
              <span>INITIATE</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Module Card 3: Quality & Metrology */}
          <div className="bg-white/80 backdrop-blur-xl p-6 relative flex flex-col h-full rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
            <div className="flex justify-between items-start mb-4 border-b border-[#E2E8F0] pb-4">
              <div>
                <span className="font-mono text-[10px] font-bold text-slate-500 px-2 py-1 rounded border border-slate-300 border-dashed mb-2 inline-block">
                  [MOD-03] • PLANNED
                </span>
                <h2 className="text-xl font-bold text-slate-800 font-['Hanken_Grotesk'] mt-1">
                  Quality &amp; Metrology
                </h2>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500">
                <ShieldCheck className="w-7 h-7" />
              </div>
            </div>

            <p className="text-slate-500 text-sm flex-grow mb-6 leading-relaxed">
              Statistical Process Control (SPC), CMM dimension inspection logging, First-Piece approval gates, and defect Pareto analysis.
            </p>

            <button 
              onClick={() => showModuleNotice('Quality & Metrology')}
              className="w-full py-3 font-mono text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex justify-center items-center gap-2 cursor-pointer"
            >
              <span>INITIATE</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Module Card 4: TPM Maintenance */}
          <div className="bg-white/80 backdrop-blur-xl p-6 relative flex flex-col h-full rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
            <div className="flex justify-between items-start mb-4 border-b border-[#E2E8F0] pb-4">
              <div>
                <span className="font-mono text-[10px] font-bold text-slate-500 px-2 py-1 rounded border border-slate-300 border-dashed mb-2 inline-block">
                  [MOD-04] • PLANNED
                </span>
                <h2 className="text-xl font-bold text-slate-800 font-['Hanken_Grotesk'] mt-1">
                  TPM Maintenance
                </h2>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500">
                <Wrench className="w-7 h-7" />
              </div>
            </div>

            <p className="text-slate-500 text-sm flex-grow mb-6 leading-relaxed">
              Total Productive Maintenance, MTBF/MTTR telemetry, preventive maintenance scheduling, and machine breakdown work orders.
            </p>

            <button 
              onClick={() => showModuleNotice('TPM Maintenance')}
              className="w-full py-3 font-mono text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex justify-center items-center gap-2 cursor-pointer"
            >
              <span>INITIATE</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Module Card 5: ERP & MES Connector */}
          <div className="bg-white/80 backdrop-blur-xl p-6 relative flex flex-col h-full rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
            <div className="flex justify-between items-start mb-4 border-b border-[#E2E8F0] pb-4">
              <div>
                <span className="font-mono text-[10px] font-bold text-slate-500 px-2 py-1 rounded border border-slate-300 border-dashed mb-2 inline-block">
                  [MOD-05] • PLANNED
                </span>
                <h2 className="text-xl font-bold text-slate-800 font-['Hanken_Grotesk'] mt-1">
                  ERP Sync Gateway
                </h2>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500">
                <Layers className="w-7 h-7" />
              </div>
            </div>

            <p className="text-slate-500 text-sm flex-grow mb-6 leading-relaxed">
              Real-time SAP / Oracle ERP sync gateway, shopfloor production dispatching, BOM verification, and dispatch telemetry.
            </p>

            <button 
              onClick={() => showModuleNotice('ERP Sync Gateway')}
              className="w-full py-3 font-mono text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex justify-center items-center gap-2 cursor-pointer"
            >
              <span>INITIATE</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Module Card 6: Security Governance */}
          <div className="bg-white/80 backdrop-blur-xl p-6 relative flex flex-col h-full rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
            <div className="flex justify-between items-start mb-4 border-b border-[#E2E8F0] pb-4">
              <div>
                <span className="font-mono text-[10px] font-bold text-slate-500 px-2 py-1 rounded border border-slate-300 border-dashed mb-2 inline-block">
                  [MOD-06] • PLANNED
                </span>
                <h2 className="text-xl font-bold text-slate-800 font-['Hanken_Grotesk'] mt-1">
                  Security Governance
                </h2>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500">
                <Lock className="w-7 h-7" />
              </div>
            </div>

            <p className="text-slate-500 text-sm flex-grow mb-6 leading-relaxed">
              Enterprise Role-Based Access Control (RBAC), multi-factor audit trails, session telemetry, and credential policies.
            </p>

            <button 
              onClick={() => showModuleNotice('Security Governance')}
              className="w-full py-3 font-mono text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex justify-center items-center gap-2 cursor-pointer"
            >
              <span>INITIATE</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </main>

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed bottom-16 right-8 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-[#4C7FFF] animate-ping" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Notifications Drawer / Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#0652d2]" />
                <h3 className="font-bold text-slate-900 text-base">System Notifications</h3>
              </div>
              <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 font-mono text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                <div className="font-bold mb-0.5">✓ SFC Intelligence Engine: Active</div>
                <div className="text-[11px] text-emerald-700">Kaizen, PPSR, and 5S sync pipelines operational.</div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800">
                <div className="font-bold mb-0.5">ℹ️ Single Sign-On Authenticated</div>
                <div className="text-[11px] text-blue-700">Logged in as {currentUser?.username || 'User'} ({roleBadge.label}).</div>
              </div>
            </div>
            <button 
              onClick={() => setShowNotifications(false)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#0652d2]" />
                <h3 className="font-bold text-slate-900 text-base">KSPG Cockpit Guidance</h3>
              </div>
              <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                Welcome to the <strong>KSPG Cockpit Enterprise Portal</strong>. This hub allows you to access industrial modules:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs font-mono bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
                <li><strong>SFC Intelligence:</strong> Kaizen improvement cycle, PPSR problem solving, 5S audits, Safety incidents.</li>
                <li><strong>Top Right SFMS Back:</strong> When inside SFC, click <em>"← Back to Cockpit"</em> to return here anytime.</li>
              </ul>
            </div>
            <button 
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 bg-[#0652d2] text-white rounded-xl font-bold text-xs hover:bg-[#003ea6] transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Modern High-Tech Footer */}
      <footer className="bg-white/90 backdrop-blur-md font-mono text-[11px] border-t border-[#E2E8F0] flex flex-col sm:flex-row justify-between items-center w-full px-6 md:px-12 py-4 z-40 relative gap-3 sm:gap-0">
        <div className="flex items-center gap-2 text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>© 2024 KSPG INTERNAL OPERATIONS | SYSTEM NOMINAL</span>
        </div>
        <div className="flex gap-6 text-slate-500 font-semibold">
          <span className="text-[#0652d2]">REV-01.44</span>
          <span className="hover:text-slate-800 transition-colors">LEGAL</span>
          <span className="hover:text-slate-800 transition-colors">SECURITY PROTOCOL</span>
        </div>
      </footer>
    </div>
  );
}
