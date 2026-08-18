import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PpsrSheetInspect from './components/PpsrSheetInspect';
import GlobalDashboardModule from './modules/GlobalDashboardModule';
import KaizenModule from './modules/KaizenModule';
import RedFlagModule from './modules/RedFlagModule';
import FiveSModule from './modules/FiveSModule';
import SafetyModule from './modules/SafetyModule';
import PpsrModule from './modules/PpsrModule';
import CftAwardsModule from './modules/CftAwardsModule';
import { Kaizen, UserPersona, RedFlag, FiveSAudit, SafetyIncident, PpsrReport, PpsrMeetingLog, OpenImpactAction } from './types';
import { Eye, X, Award, Lightbulb, Check, FileText, CheckCircle, HelpCircle, Printer, LayoutDashboard, Flag, Sparkles, ShieldAlert, Compass, Menu } from 'lucide-react';
import { formatIndianRupees } from './utils';

export default function App() {
  const [persona, setPersona] = useState<UserPersona>('manager');
  
  // Top Level Navigation Module Switcher
  const [activeModule, setActiveModule] = useState<'global-dashboard' | 'kaizen' | 'redflag' | 'fives' | 'safety' | 'ppsr' | 'cft-awards'>('global-dashboard');
  
  // Kaizen internal tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'committee' | 'list' | 'cft-awards' | 'impact-tracker' | 'process-flowchart'>('dashboard');

  // Mobile drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Master States
  const [kaizens, setKaizens] = useState<Kaizen[]>([]);
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [fiveSAudits, setFiveSAudits] = useState<FiveSAudit[]>([]);
  const [safetyIncidents, setSafetyIncidents] = useState<SafetyIncident[]>([]);
  const [ppsrReports, setPpsrReports] = useState<PpsrReport[]>([]);
  const [ppsrMeetings, setPpsrMeetings] = useState<PpsrMeetingLog[]>([]);
  const [impactActions, setImpactActions] = useState<OpenImpactAction[]>([]);

  // Safe custom notification state to replace iframe-blocked alert() calls
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    // Intercept native alert calls and redirect them to beautiful toast notifications
    const originalAlert = window.alert;
    window.alert = (msg: string) => {
      console.log('Intercepted window.alert:', msg);
      const isErrorOrWarning = msg.toLowerCase().includes('error') || 
                               msg.toLowerCase().includes('fail') || 
                               msg.toLowerCase().includes('required') ||
                               msg.toLowerCase().includes('please');
      setToast({
        message: msg,
        type: isErrorOrWarning ? 'info' : 'success'
      });
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toast]);


  const [isLoading, setIsLoading] = useState(true);
  const [inspectKaizen, setInspectKaizen] = useState<Kaizen | null>(null);
  const [inspectPpsr, setInspectPpsr] = useState<PpsrReport | null>(null);

  // Submenu Quick triggers
  const [initialRedFlagAction, setInitialRedFlagAction] = useState<string | null>(null);
  const [initialFiveSAction, setInitialFiveSAction] = useState<string | null>(null);
  const [initialSafetyAction, setInitialSafetyAction] = useState<string | null>(null);
  const [initialPpsrAction, setInitialPpsrAction] = useState<string | null>(null);

  // Sync persona workflow
  const handleSetPersona = (newPersona: UserPersona) => {
    setPersona(newPersona);
    if (newPersona === 'operator') {
      setActiveModule('kaizen');
      setActiveTab('form');
    } else if (newPersona === 'committee') {
      setActiveModule('kaizen');
      setActiveTab('committee');
    } else {
      setActiveModule('global-dashboard');
    }
  };

  // Helper to normalize Kaizens from backend into strict frontend types
  const normalizeKaizen = (k: any): Kaizen => {
    const rawStatus = (k.status || '').toLowerCase().trim();
    let normalizedStatus: 'Pending' | 'Approved' | 'Good Point' | 'Rejected' = 'Pending';
    if (rawStatus === 'approved') normalizedStatus = 'Approved';
    else if (rawStatus === 'good_point' || rawStatus === 'good point') normalizedStatus = 'Good Point';
    else if (rawStatus === 'rejected') normalizedStatus = 'Rejected';
    else normalizedStatus = 'Pending'; // 'draft', 'submitted', 'pending', 'rework'

    const rawClass = (k.classification || '').toLowerCase().trim();
    let normalizedClass: 'Kaizen' | 'Good Point' | 'Pending' | 'None' = 'Pending';
    if (rawClass === 'kaizen') normalizedClass = 'Kaizen';
    else if (rawClass === 'good_point' || rawClass === 'good point') normalizedClass = 'Good Point';
    else if (rawClass === 'none') normalizedClass = 'None';
    else normalizedClass = 'Pending';

    const rawB = k.benefits || {};
    const normalizedBenefits = {
      p: Boolean(rawB.p ?? rawB.productivity),
      q: Boolean(rawB.q ?? rawB.quality),
      c: Boolean(rawB.c ?? rawB.cost),
      d: Boolean(rawB.d ?? rawB.delivery),
      s: Boolean(rawB.s ?? rawB.safety),
      m: Boolean(rawB.m ?? rawB.morale),
    };

    return {
      ...k,
      id: String(k.id),
      title: k.title || '',
      srNo: k.srNo || k.sr_no || `KZ-${k.id}`,
      month: k.month || 'August',
      suggestionDate: k.suggestionDate || k.suggestion_date || '',
      problemBefore: k.problemBefore || k.problem_before || '',
      counterMeasureAfter: k.counterMeasureAfter || k.counter_measure_after || '',
      result: k.result || '',
      remark: k.remark || '',
      status: normalizedStatus,
      classification: normalizedClass,
      benefits: normalizedBenefits,
      costSave: typeof k.costSave === 'string' ? parseFloat(k.costSave) || 0 : (k.costSave ?? (k.cost_save ? parseFloat(k.cost_save) || 0 : 0)),
      area: k.area || '',
      minifactory: k.miniFactory || k.minifactory || k.mini_factory || 'MF1',
      location: k.location || '',
      machine: k.machine || '',
      ideaBy: k.ideaBy || k.idea_by || '',
      implementedBy: k.implementedBy || k.implemented_by || '',
      preparedBy: k.preparedBy || k.prepared_by || '',
      approvedBy: k.approvedBy || k.approved_by || '',
      verifiedBy: k.verifiedByName || k.verified_by_name || k.verifiedBy || '',
      implementedDate: k.implementationDate || k.implementation_date || k.implementedDate || '',
      closingTargetDate: k.closingTargetDate || k.closing_target_date || '',
      photoBeforeUrl: k.photoBeforeUrl || k.photo_before_url || null,
      photoAfterUrl: k.photoAfterUrl || k.photo_after_url || null,
      createdAt: k.createdAt || k.created_at || new Date().toISOString(),
    };
  };

  // Fetch all shopfloor modules data
  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch Kaizens from Django Backend
      const resK = await fetch('/api/v1/kaizens/');
      const dataK = await resK.json();
      let rawList: any[] = [];
      if (dataK.results && Array.isArray(dataK.results)) {
        rawList = dataK.results;
      } else if (dataK.data && Array.isArray(dataK.data)) {
        rawList = dataK.data;
      } else if (Array.isArray(dataK)) {
        rawList = dataK;
      }
      setKaizens(rawList.map(normalizeKaizen));

      // Fetch Redflags
      const resR = await fetch('/api/redflags');
      const dataR = await resR.json();
      if (dataR.success) setRedFlags(dataR.data);

      // Fetch 5S Audits
      const resF = await fetch('/api/fivesaudits');
      const dataF = await resF.json();
      if (dataF.success) setFiveSAudits(dataF.data);

      // Fetch Safety Incidents
      const resS = await fetch('/api/safetyincidents');
      const dataS = await resS.json();
      if (dataS.success) setSafetyIncidents(dataS.data);

      // Fetch PPSRs
      const resP = await fetch('/api/ppsrreports');
      const dataP = await resP.json();
      if (dataP.success) setPpsrReports(dataP.data);

      // Fetch PPSR Meetings
      const resM = await fetch('/api/ppsrmeetings');
      const dataM = await resM.json();
      if (dataM.success) setPpsrMeetings(dataM.data);

      // Fetch Open Impact Actions
      const resI = await fetch('/api/impactactions');
      const dataI = await resI.json();
      if (dataI.success) setImpactActions(dataI.data);

    } catch (err) {
      console.error('Error loading SFMS data from backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Post Kaizen — translate camelCase frontend fields → snake_case Django fields
  const handleAddKaizen = async (newKaizen: Partial<Kaizen> & { photoBeforeFile?: File; photoAfterFile?: File }) => {
    try {
      // Map frontend camelCase keys to Django snake_case keys
      const djangoPayload: Record<string, any> = {
        title: newKaizen.title,
        month: newKaizen.month || new Date().toLocaleString('en-US', { month: 'long' }),
        suggestion_date: newKaizen.suggestionDate,
        problem_before: newKaizen.problemBefore,
        counter_measure_after: newKaizen.counterMeasureAfter,
        area: newKaizen.area,
        mini_factory: newKaizen.minifactory,
        location: newKaizen.location,
        machine: newKaizen.machine,
        closing_target_date: newKaizen.closingTargetDate || null,
        implementation_date: newKaizen.implementedDate || null,
        cost_save: newKaizen.costSave ?? 0,
        idea_by: newKaizen.ideaBy,
        implemented_by: newKaizen.implementedBy,
        prepared_by: newKaizen.preparedBy,
        remark: newKaizen.remark || '',
        result: newKaizen.result || '',
        status: 'submitted',
        classification: 'pending',
      };

      // Map benefits: {p,q,c,d,s,m} → {productivity, quality, cost, delivery, safety, morale}
      if (newKaizen.benefits) {
        djangoPayload.benefits = {
          productivity: Boolean(newKaizen.benefits.p),
          quality: Boolean(newKaizen.benefits.q),
          cost: Boolean(newKaizen.benefits.c),
          delivery: Boolean(newKaizen.benefits.d),
          safety: Boolean(newKaizen.benefits.s),
          morale: Boolean(newKaizen.benefits.m),
          p: Boolean(newKaizen.benefits.p),
          q: Boolean(newKaizen.benefits.q),
          c: Boolean(newKaizen.benefits.c),
          d: Boolean(newKaizen.benefits.d),
          s: Boolean(newKaizen.benefits.s),
          m: Boolean(newKaizen.benefits.m),
        };
      }

      const res = await fetch('/api/v1/kaizens/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(djangoPayload),
      });
      const data = await res.json();
      if (data.success || data.id) {
        const kaizenId = data.data?.id || data.id;

        // Upload Before photo if a real file was selected
        if (kaizenId && newKaizen.photoBeforeFile) {
          try {
            const formData = new FormData();
            formData.append('photo_type', 'before');
            formData.append('image', newKaizen.photoBeforeFile);
            await fetch(`/api/v1/kaizens/${kaizenId}/upload-photo/`, {
              method: 'POST',
              body: formData,
            });
          } catch (photoErr) {
            console.warn('Before photo upload failed (non-critical):', photoErr);
          }
        }

        // Upload After photo if a real file was selected
        if (kaizenId && newKaizen.photoAfterFile) {
          try {
            const formData = new FormData();
            formData.append('photo_type', 'after');
            formData.append('image', newKaizen.photoAfterFile);
            await fetch(`/api/v1/kaizens/${kaizenId}/upload-photo/`, {
              method: 'POST',
              body: formData,
            });
          } catch (photoErr) {
            console.warn('After photo upload failed (non-critical):', photoErr);
          }
        }

        // Refresh list to get updated photo URLs from backend
        fetchAllData();
        setActiveTab('dashboard');
        alert('Your Kaizen Sheet was successfully logged in the system! It is now pending committee review.');
      } else {
        console.error('Kaizen POST failed:', data);
        alert(`Error saving Kaizen: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error('Error adding Kaizen:', err);
      alert('Error saving Kaizen.');
    }
  };

  // Update Kaizen (Review / Audit / PQCDSM / Status / Cost Savings)
  const handleUpdateKaizen = async (id: string, updatedFields: Partial<Kaizen>) => {
    try {
      const djangoPayload: Record<string, any> = {};
      if (updatedFields.title !== undefined) djangoPayload.title = updatedFields.title;
      if (updatedFields.problemBefore !== undefined) djangoPayload.problem_before = updatedFields.problemBefore;
      if (updatedFields.counterMeasureAfter !== undefined) djangoPayload.counter_measure_after = updatedFields.counterMeasureAfter;
      if (updatedFields.result !== undefined) djangoPayload.result = updatedFields.result;
      if (updatedFields.remark !== undefined) djangoPayload.remark = updatedFields.remark;
      if (updatedFields.costSave !== undefined) djangoPayload.cost_save = updatedFields.costSave;
      if (updatedFields.area !== undefined) djangoPayload.area = updatedFields.area;
      if (updatedFields.minifactory !== undefined) djangoPayload.mini_factory = updatedFields.minifactory;
      if (updatedFields.location !== undefined) djangoPayload.location = updatedFields.location;
      if (updatedFields.machine !== undefined) djangoPayload.machine = updatedFields.machine;
      if (updatedFields.approvedBy !== undefined) djangoPayload.approved_by = updatedFields.approvedBy;
      if (updatedFields.verifiedBy !== undefined) djangoPayload.verified_by_name = updatedFields.verifiedBy;
      if (updatedFields.implementedDate !== undefined) djangoPayload.implementation_date = updatedFields.implementedDate || null;
      if (updatedFields.closingTargetDate !== undefined) djangoPayload.closing_target_date = updatedFields.closingTargetDate || null;

      // Status mapping
      if (updatedFields.status !== undefined) {
        const s = updatedFields.status.toLowerCase().replace(' ', '_');
        if (s === 'pending') djangoPayload.status = 'submitted';
        else if (s === 'good_point') djangoPayload.status = 'good_point';
        else if (s === 'approved') djangoPayload.status = 'approved';
        else if (s === 'rejected') djangoPayload.status = 'rejected';
        else djangoPayload.status = s;
      }

      // Classification mapping
      if (updatedFields.classification !== undefined) {
        const c = updatedFields.classification.toLowerCase().replace(' ', '_');
        djangoPayload.classification = c;
      }

      // Benefits mapping
      if (updatedFields.benefits !== undefined) {
        djangoPayload.benefits = {
          productivity: Boolean(updatedFields.benefits.p ?? (updatedFields.benefits as any).productivity),
          quality: Boolean(updatedFields.benefits.q ?? (updatedFields.benefits as any).quality),
          cost: Boolean(updatedFields.benefits.c ?? (updatedFields.benefits as any).cost),
          delivery: Boolean(updatedFields.benefits.d ?? (updatedFields.benefits as any).delivery),
          safety: Boolean(updatedFields.benefits.s ?? (updatedFields.benefits as any).safety),
          morale: Boolean(updatedFields.benefits.m ?? (updatedFields.benefits as any).morale),
          p: Boolean(updatedFields.benefits.p ?? (updatedFields.benefits as any).productivity),
          q: Boolean(updatedFields.benefits.q ?? (updatedFields.benefits as any).quality),
          c: Boolean(updatedFields.benefits.c ?? (updatedFields.benefits as any).cost),
          d: Boolean(updatedFields.benefits.d ?? (updatedFields.benefits as any).delivery),
          s: Boolean(updatedFields.benefits.s ?? (updatedFields.benefits as any).safety),
          m: Boolean(updatedFields.benefits.m ?? (updatedFields.benefits as any).morale),
        };
      }

      const res = await fetch(`/api/v1/kaizens/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(djangoPayload)
      });
      const data = await res.json();
      
      if (res.ok || data.success || data.id) {
        // Optimistically update state immediately
        setKaizens(prev => prev.map(k => String(k.id) === String(id) ? normalizeKaizen({ ...k, ...updatedFields }) : k));
        await fetchAllData();
        if (inspectKaizen && String(inspectKaizen.id) === String(id)) {
          setInspectKaizen(prev => prev ? normalizeKaizen({ ...prev, ...updatedFields }) : null);
        }
      } else {
        console.error('Kaizen PATCH failed:', data);
        alert(`Error updating Kaizen: ${data?.error?.message || data?.message || JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error('Error updating Kaizen:', err);
    }
  };

  // Red Flags
  const handleAddRedFlag = async (rfData: Partial<RedFlag>) => {
    try {
      const res = await fetch('/api/redflags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rfData)
      });
      const data = await res.json();
      if (data.success) {
        setRedFlags(prev => [data.data, ...prev]);
        alert(`Red Flag raised on shopfloor! Serial Number: ${data.data.redFlagNo}. Under responsible team: ${data.data.responsibleDepartment}`);
      }
    } catch (err) {
      console.error('Error raising Redflag:', err);
    }
  };

  const handleUpdateRedFlag = async (id: string, rfData: Partial<RedFlag>) => {
    try {
      const res = await fetch(`/api/redflags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rfData)
      });
      const data = await res.json();
      if (data.success) {
        setRedFlags(prev => prev.map(r => r.id === id ? data.data : r));
      }
    } catch (err) {
      console.error('Error updating Redflag:', err);
    }
  };

  // 5S Audits
  const handleAddFiveSAudit = async (fsData: Partial<FiveSAudit>) => {
    try {
      const res = await fetch('/api/fivesaudits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fsData)
      });
      const data = await res.json();
      if (data.success) {
        setFiveSAudits(prev => [data.data, ...prev]);
      }
    } catch (err) {
      console.error('Error adding 5S Audit:', err);
    }
  };

  // Safety Incidents
  const handleAddSafetyIncident = async (sfData: Partial<SafetyIncident>) => {
    try {
      const res = await fetch('/api/safetyincidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sfData)
      });
      const data = await res.json();
      if (data.success) {
        setSafetyIncidents(prev => [data.data, ...prev]);
      }
    } catch (err) {
      console.error('Error adding Safety Incident:', err);
    }
  };

  const handleUpdateSafetyIncident = async (id: string, sfData: Partial<SafetyIncident>) => {
    try {
      const res = await fetch(`/api/safetyincidents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sfData)
      });
      const data = await res.json();
      if (data.success) {
        setSafetyIncidents(prev => prev.map(s => s.id === id ? data.data : s));
      }
    } catch (err) {
      console.error('Error updating Safety incident:', err);
    }
  };

  // PPSR Problem solver
  const handleAddPpsrReport = async (ppsrData: Partial<PpsrReport>) => {
    try {
      const res = await fetch('/api/ppsrreports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ppsrData)
      });
      const data = await res.json();
      if (data.success) {
        setPpsrReports(prev => [data.data, ...prev]);
      }
    } catch (err) {
      console.error('Error adding PPSR:', err);
    }
  };

  const handleUpdatePpsrReport = async (id: string, ppsrData: Partial<PpsrReport>) => {
    try {
      const res = await fetch(`/api/ppsrreports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ppsrData)
      });
      const data = await res.json();
      if (data.success) {
        setPpsrReports(prev => prev.map(p => p.id === id ? data.data : p));
      }
    } catch (err) {
      console.error('Error updating PPSR:', err);
    }
  };

  const handleAddPpsrMeeting = async (mtgData: Partial<PpsrMeetingLog>) => {
    try {
      const res = await fetch('/api/ppsrmeetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mtgData)
      });
      const data = await res.json();
      if (data.success) {
        setPpsrMeetings(prev => [data.data, ...prev]);
      }
    } catch (err) {
      console.error('Error adding PPSR meeting:', err);
    }
  };

  // Open Impact Action handlers
  const handleAddImpactAction = async (actData: Partial<OpenImpactAction>) => {
    try {
      const res = await fetch('/api/impactactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actData)
      });
      const data = await res.json();
      if (data.success) {
        setImpactActions(prev => [data.data, ...prev]);
      }
    } catch (err) {
      console.error('Error adding Impact Action:', err);
    }
  };

  const handleUpdateImpactAction = async (id: string, updates: Partial<OpenImpactAction>) => {
    try {
      const res = await fetch(`/api/impactactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setImpactActions(prev => prev.map(a => a.id === id ? data.data : a));
      }
    } catch (err) {
      console.error('Error updating Impact Action:', err);
    }
  };

  const handleDeleteImpactAction = async (id: string) => {
    try {
      const res = await fetch(`/api/impactactions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setImpactActions(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Error deleting Impact Action:', err);
    }
  };

  const openRedflagsCount = redFlags.filter(r => r.status === 'Open' || r.status === 'In-Progress').length;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      
      {/* Left Panel Sidebar */}
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        persona={persona}
        setPersona={handleSetPersona}
        openRedflagsCount={openRedflagsCount}
        setInitialRedFlagAction={setInitialRedFlagAction}
        setInitialFiveSAction={setInitialFiveSAction}
        setInitialSafetyAction={setInitialSafetyAction}
        setInitialPpsrAction={setInitialPpsrAction}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Mobile menu toggle button for small screens */}
        {!isMobileSidebarOpen && (
          <div className="md:hidden p-3 print:hidden shrink-0 flex items-center justify-between bg-slate-900 text-white">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold font-mono"
            >
              <Menu className="w-4 h-4" />
              <span>SFMS MENU</span>
            </button>
            <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">
              SHOPFLOOR MS
            </span>
          </div>
        )}

        {/* Main Body content renderer */}
        <main className="flex-1 pb-16 print:hidden">
          {isLoading ? (
            <div className="max-w-md mx-auto text-center py-24 space-y-4">
              <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-500 font-mono uppercase tracking-widest">CONNECTING SFMS TERMINAL...</p>
            </div>
          ) : (
            <div className="animate-fade-in">
            
            {/* 1. Global Executive Dashboard Module */}
            {activeModule === 'global-dashboard' && (
              <GlobalDashboardModule
                kaizens={kaizens}
                redFlags={redFlags}
                fiveSAudits={fiveSAudits}
                safetyIncidents={safetyIncidents}
                ppsrReports={ppsrReports}
                onNavigateToModule={(mod, subAction) => {
                  setActiveModule(mod);
                  if (mod === 'kaizen') {
                    if (subAction) {
                      setActiveTab(subAction as any);
                    } else {
                      setActiveTab('dashboard');
                    }
                  } else if (mod === 'redflag') {
                    if (subAction) {
                      setInitialRedFlagAction(subAction);
                    }
                  } else if (mod === 'fives') {
                    if (subAction) {
                      setInitialFiveSAction(subAction);
                    }
                  } else if (mod === 'safety') {
                    if (subAction) {
                      setInitialSafetyAction(subAction);
                    }
                  } else if (mod === 'ppsr') {
                    if (subAction) {
                      setInitialPpsrAction(subAction);
                    }
                  }
                }}
              />
            )}

            {/* 2. Kaizen Continuous Improvement Module */}
            {activeModule === 'kaizen' && (
              <KaizenModule
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                kaizens={kaizens}
                ppsrReports={ppsrReports}
                impactActions={impactActions}
                onAddKaizen={handleAddKaizen}
                onUpdateKaizen={handleUpdateKaizen}
                onAddImpactAction={handleAddImpactAction}
                onUpdateImpactAction={handleUpdateImpactAction}
                onDeleteImpactAction={handleDeleteImpactAction}
                onUpdatePpsrReport={handleUpdatePpsrReport}
                onSelectKaizen={setInspectKaizen}
                handleSetPersona={handleSetPersona}
              />
            )}

            {/* 3. Red Flag Quality Portal Module */}
            {activeModule === 'redflag' && (
              <RedFlagModule
                redFlags={redFlags}
                onAddRedFlag={handleAddRedFlag}
                onUpdateRedFlag={handleUpdateRedFlag}
                currentPersona={persona}
                initialAction={initialRedFlagAction}
                onClearInitialAction={() => setInitialRedFlagAction(null)}
              />
            )}

            {/* 4. 5S Audit System Module */}
            {activeModule === 'fives' && (
              <FiveSModule
                audits={fiveSAudits}
                onAddAudit={handleAddFiveSAudit}
                initialAction={initialFiveSAction}
                onClearInitialAction={() => setInitialFiveSAction(null)}
              />
            )}

            {/* 5. Safety Tracker Module */}
            {activeModule === 'safety' && (
              <SafetyModule
                incidents={safetyIncidents}
                onAddIncident={handleAddSafetyIncident}
                onUpdateIncident={handleUpdateSafetyIncident}
                initialAction={initialSafetyAction}
                onClearInitialAction={() => setInitialSafetyAction(null)}
              />
            )}

            {/* 6. PPSR Root Cause Problem Solver Module */}
            {activeModule === 'ppsr' && (
              <PpsrModule
                reports={ppsrReports}
                kaizens={kaizens}
                onAddReport={handleAddPpsrReport}
                onUpdateReport={handleUpdatePpsrReport}
                onUpdateKaizen={handleUpdateKaizen}
                initialAction={initialPpsrAction}
                onClearInitialAction={() => setInitialPpsrAction(null)}
                onInspectReport={(report) => setInspectPpsr(report)}
                meetings={ppsrMeetings}
                onAddMeeting={handleAddPpsrMeeting}
              />
            )}

            {/* 7. CFT Monthly Best Awards Module */}
            {activeModule === 'cft-awards' && (
              <CftAwardsModule
                kaizens={kaizens}
                ppsrReports={ppsrReports}
                onUpdateKaizen={handleUpdateKaizen}
                onUpdatePpsrReport={handleUpdatePpsrReport}
              />
            )}

          </div>
        )}
      </main>

      {/* SHEET INSPECT OVERLAY MODAL (Attachment 1 Paper Layout Replication) */}
      {inspectKaizen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0 print:m-0 print:overflow-visible">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 max-h-[90vh] print:border-none print:shadow-none print:rounded-none print:max-h-none print:max-w-none print:w-full print:m-0 print:p-0 print:overflow-visible">
            
            {/* Modal Header Controls */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0 print:hidden">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span className="font-mono text-xs font-bold text-slate-300">INSPECT KAIZEN SHEET REGISTER • ID: {inspectKaizen.srNo}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Print Kaizen Sheet"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print to PDF</span>
                </button>
                <button
                  onClick={() => setInspectKaizen(null)}
                  className="text-slate-400 hover:text-white transition p-1.5 bg-slate-800 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Sheet */}
            <div className="p-6 overflow-y-auto bg-slate-100/50 space-y-6 print:p-0 print:bg-white print:overflow-visible print:space-y-8">
              
              {/* Paper Layout Card */}
              <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden text-slate-800 font-sans print:border print:border-slate-400 print:rounded-none print:shadow-none">
                
                {/* 1. Header Banner */}
                <div className="border-b border-slate-300 text-center py-5 px-4 bg-white">
                  <h1 className="text-2xl font-black tracking-wider text-slate-900 uppercase font-mono">
                    KAIZEN SHEET
                  </h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mt-1">
                    (Continuous Improvement Protocol Form)
                  </p>
                </div>

                {/* 2. Paper Meta Table */}
                <div className="grid grid-cols-1 md:grid-cols-4 border-b border-slate-300 text-xs font-mono">
                  <div className="border-r border-b md:border-b-0 border-slate-300 p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Created By (Idea By)</span>
                    <span className="font-bold text-slate-800">{inspectKaizen.ideaBy}</span>
                  </div>
                  <div className="border-r border-b md:border-b-0 border-slate-300 p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Approved By Sign-off</span>
                    <span className="font-bold text-slate-800">{inspectKaizen.approvedBy || "NOT APPROVED YET"}</span>
                  </div>
                  <div className="border-r border-slate-300 p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Document ID</span>
                    <span className="font-black text-slate-900 text-sm">{inspectKaizen.srNo}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Version - Status</span>
                    <span className={`font-black uppercase text-xs ${inspectKaizen.status === 'Pending' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      V1.0 - {inspectKaizen.status}
                    </span>
                  </div>
                </div>

                {/* 3. Problem Before vs Counter Measure After */}
                <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-300 divide-y md:divide-y-0 md:divide-x divide-slate-300">
                  
                  {/* Left: Problem Before */}
                  <div className="md:col-span-5 p-5 space-y-3">
                    <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider border-b border-red-100 pb-1 font-mono">
                      Problem / Before Status :
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                      {inspectKaizen.problemBefore}
                    </p>
                  </div>

                  {/* Middle: Countermeasure */}
                  <div className="md:col-span-4 p-5 space-y-3 bg-slate-50/20">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b border-emerald-100 pb-1 font-mono">
                      Counter Measure / After Improvement :
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                      {inspectKaizen.counterMeasureAfter}
                    </p>
                  </div>

                  {/* Right: Area Meta */}
                  <div className="md:col-span-3 p-4 bg-slate-50 font-mono text-[10px] space-y-2.5">
                    <h4 className="text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200 pb-1">
                      Area of Implementation:
                    </h4>
                    <div>
                      <span className="text-slate-400 uppercase font-black block">Minifactory:</span>
                      <span className="text-slate-900 font-bold text-[11px]">{inspectKaizen.minifactory}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-black block">Location:</span>
                      <span className="text-slate-800 font-bold">{inspectKaizen.location}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-black block">Machine/Station:</span>
                      <span className="text-slate-800 font-bold">{inspectKaizen.machine}</span>
                    </div>
                  </div>

                </div>

                {/* 4. Photos row */}
                <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-300 divide-y md:divide-y-0 md:divide-x divide-slate-300">
                  
                  {/* Before Photo */}
                  <div className="md:col-span-5 p-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-2">Photos: BEFORE</h4>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl aspect-video p-1 flex items-center justify-center overflow-hidden">
                      {inspectKaizen.photoBeforeUrl ? (
                        <img
                          src={inspectKaizen.photoBeforeUrl}
                          alt="Before"
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-slate-400 text-xs text-center">
                          <div className="text-2xl mb-1">📷</div>
                          <div>No before photo uploaded</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* After Photo */}
                  <div className="md:col-span-4 p-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-2">Photos: AFTER</h4>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl aspect-video p-1 flex items-center justify-center overflow-hidden">
                      {inspectKaizen.photoAfterUrl ? (
                        <img
                          src={inspectKaizen.photoAfterUrl}
                          alt="After"
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-slate-400 text-xs text-center">
                          <div className="text-2xl mb-1">📷</div>
                          <div>No after photo uploaded</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Benefits checklist PQCDSM */}
                  <div className="md:col-span-3 p-4 bg-slate-50 font-mono flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200 pb-1 mb-3">Benefits Matrix :</h4>
                      <div className="grid grid-cols-6 gap-1 text-center font-bold">
                        {['p', 'q', 'c', 'd', 's', 'm'].map(key => {
                          const active = inspectKaizen.benefits?.[key as keyof typeof inspectKaizen.benefits];
                          return (
                            <div key={key}>
                              <div className="text-[9px] uppercase text-slate-400">{key}</div>
                              <div className={`mt-0.5 border text-xs py-0.5 rounded-sm font-black ${
                                active
                                  ? 'bg-slate-900 border-slate-900 text-emerald-400'
                                  : 'border-slate-200 text-slate-300 bg-white'
                              }`}>
                                {active ? '✓' : '-'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="text-[8px] text-slate-400 leading-tight border-t border-slate-200 pt-1.5 mt-4">
                      P-Productivity | Q-Quality | C-Cost | D-Delivery | S-Safety | M-Morale
                    </div>
                  </div>

                </div>

                {/* 5. Result block */}
                <div className="p-4 bg-slate-50/10">
                  <span className="font-bold text-slate-500 uppercase font-mono text-[10px] block mb-1">Result Summary:</span>
                  <p className="text-slate-700 text-xs leading-relaxed font-sans font-medium whitespace-pre-line">
                    {inspectKaizen.result || "No outcome results summary documented yet."}
                  </p>
                </div>

                {/* 6. Sign-off Footer block */}
                <div className="border-t border-slate-300 p-4 bg-slate-50/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 uppercase font-bold block text-[9px]">Idea by:</span>
                    <span className="font-semibold text-slate-700">{inspectKaizen.ideaBy}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-bold block text-[9px]">Implemented by:</span>
                    <span className="font-semibold text-slate-700">{inspectKaizen.implementedBy || inspectKaizen.ideaBy}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-bold block text-[9px]">Prepared by:</span>
                    <span className="font-semibold text-slate-700">{inspectKaizen.preparedBy || inspectKaizen.ideaBy}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-bold block text-[9px]">Verified & Approved by:</span>
                    <span className="font-bold text-emerald-700">{inspectKaizen.approvedBy || "PENDING BOARD DECISION"}</span>
                  </div>
                </div>

              </div>

              {/* Board classification panel review inside modal */}
              <div className="bg-white border border-slate-250 rounded-2xl p-5 space-y-3 print:border print:border-slate-400 print:rounded-none print:shadow-none print-avoid-break">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide font-mono flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-slate-800" />
                  <span>Committee Classifications & Remarks Log</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-slate-600">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Status:</span>
                    <span className="font-black text-sm text-slate-800 mt-1 block">{inspectKaizen.status}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Meeting Decision:</span>
                    <span className={`font-black text-sm mt-1 block ${
                      inspectKaizen.classification === 'Kaizen'
                        ? 'text-emerald-600'
                        : inspectKaizen.classification === 'Good Point'
                        ? 'text-amber-500'
                        : 'text-slate-500'
                    }`}>
                      {inspectKaizen.classification === 'Pending' ? 'Awaiting Meeting' : inspectKaizen.classification}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Audited Value Saved:</span>
                    <span className="font-black text-sm text-emerald-600 mt-1 block">
                      {inspectKaizen.costSave > 0 ? `${formatIndianRupees(inspectKaizen.costSave)}/yr` : '₹0 (Intangible)'}
                    </span>
                  </div>
                </div>

                {inspectKaizen.remark && (
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-xs text-amber-900 leading-normal">
                    <span className="font-black font-mono block uppercase text-[10px] text-amber-800 mb-1">Committee Meeting Remarks:</span>
                    <p className="italic font-semibold">"{inspectKaizen.remark}"</p>
                  </div>
                )}
              </div>

            </div>

            {/* Close Controls */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end shrink-0 gap-3 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectKaizen(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Close Sheet Viewer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PPSR SHEET INSPECT OVERLAY MODAL */}
      {inspectPpsr && (
        <PpsrSheetInspect
          report={inspectPpsr}
          onClose={() => setInspectPpsr(null)}
        />
      )}

      {/* Floating high-fidelity toast notifications to replace blocked browser alerts */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-fade-in max-w-md bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-2xl flex items-start space-x-3 mr-4">
          <div className={`p-1.5 rounded-lg shrink-0 ${toast.type === 'success' ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'}`}>
            {toast.type === 'success' ? (
              <Check className="w-4 h-4 stroke-[3px]" />
            ) : (
              <Sparkles className="w-4 h-4 text-slate-950 animate-pulse" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              {toast.type === 'success' ? '✓ Operation Success' : '⚠️ System Notification'}
            </h4>
            <p className="text-xs font-semibold text-slate-200 mt-1 leading-relaxed">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      </div>
    </div>
  );
}
