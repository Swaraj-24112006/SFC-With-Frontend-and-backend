import React, { useState } from 'react';
import { Kaizen, KaizenImpactAssessment, ImpactItem, AllocatedResource } from '../types';
import { 
  ShieldCheck, 
  Settings, 
  FileText, 
  AlertTriangle, 
  Users, 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  Lock, 
  UserCheck, 
  ChevronRight,
  ClipboardList,
  Flame,
  Check
} from 'lucide-react';

interface KaizenImpactModalProps {
  kaizen: Kaizen;
  onClose: () => void;
  onUpdateKaizen: (id: string, updatedFields: Partial<Kaizen>) => void;
  mode?: 'review' | 'closure'; // 'review' for committee allocation, 'closure' for execution/signoff
}

export default function KaizenImpactModal({
  kaizen,
  onClose,
  onUpdateKaizen,
  mode = 'closure'
}: KaizenImpactModalProps) {
  // Existing or default impact assessment state
  const defaultImpacts: KaizenImpactAssessment = kaizen.impactAssessment || {
    decidedInReview: false,
    fiveMChange: {
      required: true,
      description: 'Check 5M (Man, Machine, Material, Method, Measurement) changes',
      assignedTo: kaizen.ideaBy || 'Kaizen Initiator',
      status: 'Pending',
      notes: ''
    },
    safetyImpact: {
      required: true,
      description: 'Perform EHS risk assessment & safety SOP check',
      assignedTo: kaizen.ideaBy || 'Kaizen Initiator',
      status: 'Pending',
      notes: ''
    },
    pfdUpdate: {
      required: true,
      description: 'Revise Process Flow Diagram (PFD) drawing',
      assignedTo: kaizen.ideaBy || 'Kaizen Initiator',
      status: 'Pending',
      notes: ''
    },
    pfmeaUpdate: {
      required: true,
      description: 'Update PFMEA failure mode RPN score',
      assignedTo: kaizen.ideaBy || 'Kaizen Initiator',
      status: 'Pending',
      notes: ''
    },
    allocatedResources: [],
    overallClosureStatus: 'In-Progress'
  };

  const [impactData, setImpactData] = useState<KaizenImpactAssessment>(defaultImpacts);
  const [activeTab, setActiveTab] = useState<'assessment' | 'resources' | 'closure'>(
    mode === 'review' ? 'assessment' : 'closure'
  );

  // User logged-in persona for submitting sign-off
  const [currentWorker, setCurrentWorker] = useState<string>(kaizen.ideaBy || 'Kaizen Initiator');

  // New resource allocation form state
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceRole, setNewResourceRole] = useState('Quality Engineer');
  const [newResourceTask, setNewResourceTask] = useState('PFMEA & Quality Inspection Update');

  // Success message toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Toggle item requirement
  const toggleRequired = (key: 'fiveMChange' | 'safetyImpact' | 'pfdUpdate' | 'pfmeaUpdate') => {
    setImpactData(prev => {
      const item = prev[key];
      const newRequired = !item.required;
      return {
        ...prev,
        [key]: {
          ...item,
          required: newRequired,
          status: newRequired ? (item.status === 'Not Required' ? 'Pending' : item.status) : 'Not Required'
        }
      };
    });
  };

  // Update impact item details
  const updateImpactItem = (
    key: 'fiveMChange' | 'safetyImpact' | 'pfdUpdate' | 'pfmeaUpdate',
    fields: Partial<ImpactItem>
  ) => {
    setImpactData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...fields
      }
    }));
  };

  // Add helper resource
  const handleAddResource = () => {
    if (!newResourceName.trim()) return;
    const newRes: AllocatedResource = {
      id: `res-${Date.now()}`,
      name: newResourceName.trim(),
      role: newResourceRole.trim(),
      taskAssigned: newResourceTask.trim()
    };
    setImpactData(prev => ({
      ...prev,
      allocatedResources: [...prev.allocatedResources, newRes]
    }));
    setNewResourceName('');
    showToast(`Allocated resource ${newRes.name} for ${newRes.taskAssigned}`);
  };

  // Remove helper resource
  const handleRemoveResource = (id: string) => {
    setImpactData(prev => ({
      ...prev,
      allocatedResources: prev.allocatedResources.filter(r => r.id !== id)
    }));
  };

  // Mark item as complete by current worker
  const handleCompleteItem = (key: 'fiveMChange' | 'safetyImpact' | 'pfdUpdate' | 'pfmeaUpdate') => {
    const today = new Date().toISOString().split('T')[0];
    updateImpactItem(key, {
      status: 'Completed',
      completedBy: currentWorker,
      completedDate: today
    });
    showToast(`Marked ${key.toUpperCase()} as COMPLETED by ${currentWorker}`);
  };

  // Save Review Meeting Assessment Decisions
  const handleSaveAssessment = () => {
    const updated: KaizenImpactAssessment = {
      ...impactData,
      decidedInReview: true,
      reviewedDate: new Date().toISOString().split('T')[0],
      reviewedBy: 'CFT Committee Lead',
      overallClosureStatus: 'Actions Allocated'
    };

    onUpdateKaizen(kaizen.id, {
      impactAssessment: updated
    });
    showToast(`Review meeting decisions & resource allocations saved for Kaizen ${kaizen.srNo}!`);
  };

  // Final submit closure
  const handleSubmitFinalClosure = () => {
    const today = new Date().toISOString().split('T')[0];
    const updated: KaizenImpactAssessment = {
      ...impactData,
      overallClosureStatus: 'Fully Closed',
      closedBy: currentWorker,
      closureDate: today,
      closureRemarks: `All 5M, Safety, PFD, and PFMEA impacts fully audited and completed by ${currentWorker}.`
    };

    onUpdateKaizen(kaizen.id, {
      impactAssessment: updated
    });
    showToast(`🏆 Kaizen ${kaizen.srNo} Process Impact Closure successfully submitted and finalized!`);
    setTimeout(() => onClose(), 1500);
  };

  // Compute stats
  const items = [
    { key: 'fiveMChange' as const, label: '5M Changes (Man, Machine, Material, Method, Measurement)', icon: Settings, color: 'text-amber-500' },
    { key: 'safetyImpact' as const, label: 'Safety & EHS Evaluation', icon: ShieldCheck, color: 'text-emerald-500' },
    { key: 'pfdUpdate' as const, label: 'Process Flow Diagram (PFD) Revision', icon: FileText, color: 'text-indigo-500' },
    { key: 'pfmeaUpdate' as const, label: 'PFMEA RPN Score Update', icon: ClipboardList, color: 'text-violet-500' }
  ];

  const totalRequired = items.filter(i => impactData[i.key].required).length;
  const totalCompleted = items.filter(i => impactData[i.key].required && impactData[i.key].status === 'Completed').length;
  const isAllCompleted = totalRequired > 0 && totalCompleted === totalRequired;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative space-y-6 my-8 text-slate-900 animate-fade-in">
        
        {/* Toast alert */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-emerald-400 border border-emerald-500 px-4 py-2.5 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase">
                {kaizen.srNo}
              </span>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase ${
                impactData.overallClosureStatus === 'Fully Closed'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {impactData.overallClosureStatus || 'In-Progress'}
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black font-display text-slate-950 leading-tight">
              Post-Kaizen Impact Closure & Resource Allocation
            </h2>
            <p className="text-xs text-slate-500 font-sans">
              Evaluate <strong>5M Changes</strong>, <strong>Safety</strong>, <strong>PFD</strong>, and <strong>PFMEA</strong> impacts decided during committee review.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition cursor-pointer self-start sm:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KAIZEN QUICK CONTEXT CARD */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs space-y-2 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <span className="text-slate-400 text-[10px] font-mono block">Kaizen Title:</span>
              <span className="font-bold text-slate-100 text-sm">{kaizen.title}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[10px] font-mono block">Initiator / Idea By:</span>
              <span className="font-mono font-bold text-emerald-400">{kaizen.ideaBy}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-300">
            <div><span className="text-slate-500">Minifactory:</span> {kaizen.minifactory}</div>
            <div><span className="text-slate-500">Location:</span> {kaizen.location}</div>
            <div><span className="text-slate-500">Machine:</span> {kaizen.machine}</div>
            <div><span className="text-slate-500">Status:</span> <strong className="text-amber-400">{kaizen.status}</strong></div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold font-mono">
          <button
            onClick={() => setActiveTab('assessment')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-2 ${
              activeTab === 'assessment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 text-amber-500" />
            <span>1. Committee Review Matrix</span>
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-2 ${
              activeTab === 'resources' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-500" />
            <span>2. Helper Resources ({impactData.allocatedResources.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('closure')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-2 ${
              activeTab === 'closure' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>3. Log Sign-Off & Closure ({totalCompleted}/{totalRequired})</span>
          </button>
        </div>

        {/* TAB 1: COMMITTEE REVIEW ASSESSMENT MATRIX */}
        {activeTab === 'assessment' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
              <div className="font-bold font-mono flex items-center space-x-1.5 text-amber-800">
                <Flame className="w-4 h-4 text-amber-600" />
                <span>Review Meeting Guidelines:</span>
              </div>
              <p>
                During the Kaizen committee review meeting, evaluate if this implementation requires updates in <strong>5M (Man, Machine, Material, Method, Measurement)</strong>, <strong>Safety risk assessment</strong>, <strong>Process Flow Diagram (PFD)</strong>, or <strong>PFMEA</strong>. By default, the initiator (<strong>{kaizen.ideaBy}</strong>) is assigned, but you can allocate additional plant support resources in Tab 2.
              </p>
            </div>

            <div className="space-y-4">
              {items.map(item => {
                const data = impactData[item.key];
                const IconComp = item.icon;

                return (
                  <div key={item.key} className={`border rounded-2xl p-4 transition ${
                    data.required ? 'bg-white border-slate-300 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-75'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <IconComp className={`w-5 h-5 ${item.color}`} />
                        <h3 className="text-xs font-bold text-slate-900 font-mono uppercase">
                          {item.label}
                        </h3>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => toggleRequired(item.key)}
                          className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                            data.required
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-200 text-slate-600 border border-slate-300'
                          }`}
                        >
                          {data.required ? '✓ Impact Required' : '✕ Not Required'}
                        </button>
                      </div>
                    </div>

                    {data.required && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">
                            Impact Description & Action Item
                          </label>
                          <input
                            type="text"
                            value={data.description || ''}
                            onChange={(e) => updateImpactItem(item.key, { description: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="e.g. Update SOP & machine calibration card"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">
                            Primary Responsibility (Default: Initiator)
                          </label>
                          <input
                            type="text"
                            value={data.assignedTo || kaizen.ideaBy}
                            onChange={(e) => updateImpactItem(item.key, { assignedTo: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveAssessment}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs rounded-2xl shadow-md transition flex items-center space-x-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>SAVE REVIEW DECISIONS</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ALLOCATE SUPPORTING HELPER RESOURCES */}
        {activeTab === 'resources' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-950 space-y-1">
              <div className="font-bold font-mono flex items-center space-x-1.5 text-indigo-800">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Allocate Helper Resources to Assist Initiator:</span>
              </div>
              <p>
                If the Kaizen requires complex technical documentation (such as PFMEA recalculations or CAD flowcharts), allocate dedicated plant personnel (Quality Leads, Safety Officers, Process Engineers) to support <strong>{kaizen.ideaBy}</strong>.
              </p>
            </div>

            {/* ADD RESOURCE FORM */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold font-mono text-slate-900 uppercase flex items-center space-x-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Allocate Additional Resource Person</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Member Name *</label>
                  <input
                    type="text"
                    value={newResourceName}
                    onChange={(e) => setNewResourceName(e.target.value)}
                    placeholder="e.g. Sunita Rao"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Role / Department</label>
                  <select
                    value={newResourceRole}
                    onChange={(e) => setNewResourceRole(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                  >
                    <option value="Quality Engineer">Quality Engineer</option>
                    <option value="Safety Specialist">Safety Specialist</option>
                    <option value="Process Lead">Process Lead</option>
                    <option value="Tooling Specialist">Tooling Specialist</option>
                    <option value="Maintenance Engineer">Maintenance Engineer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Assigned Task</label>
                  <input
                    type="text"
                    value={newResourceTask}
                    onChange={(e) => setNewResourceTask(e.target.value)}
                    placeholder="e.g., PFMEA Revision"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddResource}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Allocate Helper</span>
                </button>
              </div>
            </div>

            {/* LIST OF ALLOCATED RESOURCES */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase font-mono">
                Allocated Helper Team ({impactData.allocatedResources.length})
              </label>

              {impactData.allocatedResources.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-2xl p-6 text-center text-xs text-slate-500">
                  No additional helper resources allocated yet. By default, <strong>{kaizen.ideaBy}</strong> handles all impact tasks.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {impactData.allocatedResources.map(res => (
                    <div key={res.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-900">{res.name}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded font-bold">
                            {res.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-sans">
                          Task: <strong>{res.taskAssigned}</strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveResource(res.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveAssessment}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs rounded-2xl shadow-md transition flex items-center space-x-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>SAVE RESOURCE ALLOCATIONS</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: LOG IN & SUBMIT IMPACT CLOSURE */}
        {activeTab === 'closure' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* WORKER LOGIN SELECTOR */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                    🔑 SIGN-OFF CREDENTIAL TERMINAL
                  </span>
                  <h3 className="text-xs font-bold text-white">
                    Logged in as Action Responsible:
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <select
                    value={currentWorker}
                    onChange={(e) => setCurrentWorker(e.target.value)}
                    className="bg-slate-950 text-white border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold font-mono focus:outline-none"
                  >
                    <option value={kaizen.ideaBy}>{kaizen.ideaBy} (Initiator)</option>
                    {impactData.allocatedResources.map(r => (
                      <option key={r.id} value={`${r.name} (${r.role})`}>
                        {r.name} ({r.role})
                      </option>
                    ))}
                    <option value="Sanjay Patil (Safety Specialist)">Sanjay Patil (Safety Specialist)</option>
                    <option value="Sunita Rao (Quality Lead)">Sunita Rao (Quality Lead)</option>
                    <option value="Amit Mehta (Kaizen Lead)">Amit Mehta (Kaizen Lead)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* IMPACT CHECKLIST ITEM SIGN-OFF CARDS */}
            <div className="space-y-4">
              {items.map(item => {
                const data = impactData[item.key];
                const IconComp = item.icon;

                if (!data.required) {
                  return (
                    <div key={item.key} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs flex items-center justify-between text-slate-400">
                      <div className="flex items-center space-x-2">
                        <IconComp className="w-4 h-4 text-slate-400" />
                        <span className="font-mono font-bold uppercase">{item.label}</span>
                      </div>
                      <span className="bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                        Not Required
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={item.key} className={`border rounded-2xl p-5 space-y-3 transition ${
                    data.status === 'Completed' ? 'bg-emerald-50/50 border-emerald-300' : 'bg-white border-slate-300 shadow-2xs'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center space-x-2">
                        <IconComp className={`w-5 h-5 ${item.color}`} />
                        <h4 className="text-xs font-bold font-mono text-slate-900 uppercase">
                          {item.label}
                        </h4>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        data.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {data.status === 'Completed' ? `✓ Completed on ${data.completedDate}` : '⚡ Pending Sign-off'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="text-slate-700 font-sans">
                        Action Needed: <strong>{data.description || 'Action required as per committee review'}</strong>
                      </p>
                      <p className="text-slate-500 font-mono text-[11px]">
                        Assigned To: <strong>{data.assignedTo || kaizen.ideaBy}</strong>
                      </p>
                    </div>

                    {/* CLOSURE EVIDENCE / NOTES INPUT */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono">
                        Execution Sign-Off Evidence & Closure Notes:
                      </label>
                      <textarea
                        value={data.notes || ''}
                        onChange={(e) => updateImpactItem(item.key, { notes: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="e.g. Updated SOP document #SOP-5M-102 and conducted operator retraining."
                      />

                      <div className="flex justify-end pt-1">
                        {data.status === 'Completed' ? (
                          <div className="text-xs font-mono text-emerald-700 font-bold flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Signed off by {data.completedBy}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCompleteItem(item.key)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Sign-Off & Complete Item</span>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* FINAL CLOSURE SUBMIT BUTTON */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
              <div>
                <div className="text-xs font-bold text-white font-mono uppercase">
                  Overall Impact Closure Progress: {totalCompleted} of {totalRequired} Completed
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isAllCompleted
                    ? '🎉 All required process impacts have been signed off! Ready for final closure.'
                    : 'Complete all required 5M, Safety, PFD, and PFMEA items above to finalize Kaizen.'}
                </p>
              </div>

              <button
                type="button"
                disabled={!isAllCompleted}
                onClick={handleSubmitFinalClosure}
                className={`px-6 py-3 rounded-2xl text-xs font-mono font-black transition flex items-center justify-center space-x-2 shrink-0 ${
                  isAllCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg hover:from-emerald-400 hover:to-teal-400 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>SUBMIT FINAL KAIZEN IMPACT CLOSURE</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
