import React, { useState, useEffect } from 'react';
import { Kaizen } from '../types';
import { CheckCircle2, AlertCircle, Award, Lightbulb, Save, ShieldAlert, XCircle, FileText, ChevronDown, ChevronRight, ZoomIn, X, Maximize2, PanelLeftClose, PanelLeftOpen, Columns, Compass } from 'lucide-react';
import KaizenPresentationMode from './KaizenPresentationMode';

interface KaizenReviewBoardProps {
  kaizens: Kaizen[];
  onUpdateKaizen: (id: string, updatedFields: Partial<Kaizen>) => void;
}

export default function KaizenReviewBoard({ kaizens, onUpdateKaizen }: KaizenReviewBoardProps) {
  // Filter list of kaizens
  const [selectedId, setSelectedId] = useState<string>('');
  const [presentingKaizen, setPresentingKaizen] = useState<Kaizen | null>(null);
  
  // Horizontal layout collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Collapsible queue states (vertical accordion)
  const [isPendingCollapsed, setIsPendingCollapsed] = useState(false);
  const [isReviewedCollapsed, setIsReviewedCollapsed] = useState(false);

  // Full view photo modal state
  const [fullViewPhoto, setFullViewPhoto] = useState<{
    type: 'before' | 'after';
    url: string;
    title: string;
  } | null>(null);

  // Current editing state for review fields
  const [classification, setClassification] = useState<'Kaizen' | 'Good Point' | 'Pending' | 'None'>('Pending');
  const [status, setStatus] = useState<'Pending' | 'Approved' | 'Good Point' | 'Rejected'>('Pending');
  const [remark, setRemark] = useState('');
  const [costSave, setCostSave] = useState<number>(0);
  const [approvedBy, setApprovedBy] = useState('Rajesh Patil (Supervisor)');
  const [verifiedBy, setVerifiedBy] = useState('Amit Mehta (Kaizen Lead)');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Editable benefits in review (if the committee wants to refine operator assertions)
  const [benefits, setBenefits] = useState({ p: false, q: false, c: false, d: false, s: false, m: false });

  // Update selected Kaizen sheet when selection changes
  const selectedKaizen = kaizens.find(k => k.id === selectedId) || kaizens[0];

  useEffect(() => {
    if (selectedKaizen) {
      setSelectedId(selectedKaizen.id);
      setClassification(selectedKaizen.classification);
      setStatus(selectedKaizen.status);
      setRemark(selectedKaizen.remark || '');
      setCostSave(selectedKaizen.costSave || 0);
      setApprovedBy(selectedKaizen.approvedBy || 'Rajesh Patil (Supervisor)');
      setVerifiedBy(selectedKaizen.verifiedBy || 'Amit Mehta (Kaizen Lead)');
      setBenefits(selectedKaizen.benefits || { p: false, q: false, c: false, d: false, s: false, m: false });
    }
  }, [selectedId, selectedKaizen?.id]);

  // Handle ESC key to close photo modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullViewPhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveReview = () => {
    if (!selectedKaizen) return;
    
    // Auto-map status: If classification is Kaizen, status is Approved. If classification is Good Point, status can be Good Point or Approved.
    let targetStatus = status;
    if (status === 'Pending' && (classification === 'Kaizen' || classification === 'Good Point')) {
      targetStatus = classification === 'Good Point' ? 'Good Point' : 'Approved';
    }

    onUpdateKaizen(selectedKaizen.id, {
      classification,
      status: targetStatus,
      remark,
      costSave,
      approvedBy,
      verifiedBy,
      benefits
    });

    setSuccessMessage(`Review decision successfully logged for Kaizen ${selectedKaizen.srNo}! Classification: "${classification}".`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  if (kaizens.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-500 max-w-2xl mx-auto my-12 font-medium">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        No Kaizen reports are available to review. Switch to the Operator tab to log ideas first!
      </div>
    );
  }

  const pendingList = kaizens.filter(k => k.status === 'Pending');
  const reviewedList = kaizens.filter(k => k.status !== 'Pending');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Intro Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl mb-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-wide uppercase font-mono flex items-center space-x-2">
            <span>👥 Kaizen Committee Review</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verify PQCDSM metrics, audit savings, and designate Kaizen vs Good Point status.
          </p>
        </div>
        <div className="flex items-center space-x-2.5 shrink-0">
          {selectedKaizen && (
            <button
              type="button"
              onClick={() => setPresentingKaizen(selectedKaizen)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-bold font-mono rounded-lg transition duration-200 flex items-center space-x-2 border border-emerald-500 shadow-sm cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>🎬 PRESENTATION MODE</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-lg transition duration-200 flex items-center space-x-1.5 border border-indigo-500 shadow-xs cursor-pointer"
            title={isSidebarCollapsed ? "Show Queue Sidebar" : "Collapse Sidebar for Full Width View"}
          >
            {isSidebarCollapsed ? (
              <>
                <PanelLeftOpen className="w-4 h-4" />
                <span>Show Sidebar</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" />
                <span>Full View</span>
              </>
            )}
          </button>
          <div className="flex items-center space-x-1.5 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs font-mono font-medium text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{pendingList.length} PENDING</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Queue of Kaizens */}
        {!isSidebarCollapsed && (
          <div className="lg:col-span-4 space-y-4 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              
              {/* Header (Collapsible) */}
              <button
                type="button"
                onClick={() => setIsPendingCollapsed(!isPendingCollapsed)}
                className="w-full flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider font-mono hover:bg-slate-100/80 transition cursor-pointer select-none"
              >
                <div className="flex items-center space-x-2">
                  <span>📥 Pending Review ({pendingList.length})</span>
                  {pendingList.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                <div className="p-1 rounded-md text-slate-500 hover:text-slate-800">
                  {isPendingCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* List */}
              {!isPendingCollapsed && (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto animate-fade-in">
                  {pendingList.length === 0 ? (
                    <div className="p-4 text-xs text-center text-slate-400 font-medium">
                      🎉 No pending entries. All caught up!
                    </div>
                  ) : (
                    pendingList.map(k => (
                      <button
                        key={k.id}
                        onClick={() => setSelectedId(k.id)}
                        className={`w-full text-left p-3.5 block transition-colors ${
                          selectedId === k.id
                            ? 'bg-amber-50/50 border-l-4 border-amber-500'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">{k.srNo}</span>
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-sm uppercase tracking-wide font-mono">Pending</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">{k.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 font-sans">{k.ideaBy}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              {/* Reviewed header (Collapsible) */}
              <button
                type="button"
                onClick={() => setIsReviewedCollapsed(!isReviewedCollapsed)}
                className="w-full flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider font-mono hover:bg-slate-100/80 transition cursor-pointer select-none"
              >
                <span>✅ Reviewed / Decisioned ({reviewedList.length})</span>
                <div className="p-1 rounded-md text-slate-500 hover:text-slate-800">
                  {isReviewedCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* List */}
              {!isReviewedCollapsed && (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto animate-fade-in">
                  {reviewedList.map(k => (
                    <button
                      key={k.id}
                      onClick={() => setSelectedId(k.id)}
                      className={`w-full text-left p-3 text-xs block transition-colors ${
                        selectedId === k.id
                          ? 'bg-slate-100 border-l-4 border-slate-800'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold text-slate-400 font-mono">{k.srNo}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase font-mono ${
                          k.classification === 'Kaizen'
                            ? 'bg-emerald-100 text-emerald-800'
                            : k.classification === 'Good Point'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {k.classification === 'Pending' ? k.status : k.classification}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 truncate">{k.title}</h4>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{k.ideaBy}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Interactive Document Board */}
        {selectedKaizen && (
          <div className={`${isSidebarCollapsed ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6 transition-all duration-300`}>
            
            {/* Full view mode status bar when sidebar is collapsed */}
            {isSidebarCollapsed && (
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 p-3 rounded-2xl text-xs text-indigo-900 font-medium shadow-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="bg-indigo-600 text-white font-mono font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Full View Active
                  </span>
                  <span className="font-sans">
                    Queue sidebar is hidden horizontally so your team can view the complete Kaizen sheet and photos in full width.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="text-indigo-700 hover:text-indigo-950 font-bold underline font-mono flex items-center space-x-1.5 shrink-0 ml-2 cursor-pointer"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                  <span>Restore Sidebar Queue</span>
                </button>
              </div>
            )}
            
            {/* Kaizen Sheet Preview (Attachment 1 paper layout replication) */}
            <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPresentingKaizen(selectedKaizen)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[10px] rounded-md uppercase tracking-wider transition flex items-center space-x-1 cursor-pointer"
                >
                  <Compass className="w-3 h-3" />
                  <span>Present Kaizen</span>
                </button>
                <span className="text-[9px] font-mono font-bold text-slate-400 select-none uppercase hidden sm:inline">Sheet replica</span>
              </div>

              {/* SHEET TITLE HEADER */}
              <div className="border-b border-slate-300 bg-white p-4 text-center">
                <h1 className="text-xl font-extrabold tracking-wider text-slate-900 border-b border-slate-150 pb-1 uppercase font-mono">
                  KAIZEN SHEET
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mt-1">
                  (Continuous Improvement Form)
                </p>
              </div>

              {/* SHEET META TABLE GRID */}
              <div className="grid grid-cols-1 md:grid-cols-4 border-b border-slate-300 text-[11px] font-mono">
                <div className="border-r border-b md:border-b-0 border-slate-300 p-2">
                  <span className="text-slate-500 block uppercase font-bold text-[9px]">Created by:</span>
                  <span className="font-bold text-slate-800 truncate block">{selectedKaizen.ideaBy}</span>
                </div>
                <div className="border-r border-b md:border-b-0 border-slate-300 p-2">
                  <span className="text-slate-500 block uppercase font-bold text-[9px]">Approved by:</span>
                  <span className="font-bold text-slate-800 truncate block">{selectedKaizen.approvedBy || "NOT DECIDED YET"}</span>
                </div>
                <div className="border-r border-slate-300 p-2">
                  <span className="text-slate-500 block uppercase font-bold text-[9px]">Document ID:</span>
                  <span className="font-black text-slate-900 block">{selectedKaizen.srNo}</span>
                </div>
                <div className="p-2">
                  <span className="text-slate-500 block uppercase font-bold text-[9px]">Version - Status:</span>
                  <span className={`font-bold block uppercase ${selectedKaizen.status === 'Pending' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    V1.0 - {selectedKaizen.status}
                  </span>
                </div>
              </div>

              {/* CENTRAL SHEET DETAILS - Problem vs Counter Measure */}
              <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-300">
                
                {/* Problem Section */}
                <div className="md:col-span-5 border-r border-slate-300 p-4 space-y-2">
                  <h3 className="text-xs font-bold text-red-800 border-b border-red-100 pb-1 uppercase font-mono">
                    Problem/Before Status :
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed min-h-24 whitespace-pre-line font-medium">
                    {selectedKaizen.problemBefore}
                  </p>
                </div>

                {/* Counter Measure Section */}
                <div className="md:col-span-4 border-r border-slate-300 p-4 space-y-2 bg-slate-50/40">
                  <h3 className="text-xs font-bold text-emerald-800 border-b border-emerald-100 pb-1 uppercase font-mono">
                    Counter Measure/After Improvement :
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed min-h-24 whitespace-pre-line font-medium">
                    {selectedKaizen.counterMeasureAfter}
                  </p>
                </div>

                {/* Machinery Metadata Section */}
                <div className="md:col-span-3 p-3 bg-slate-50 text-[10px] space-y-2 font-mono">
                  <h4 className="font-bold border-b border-slate-200 pb-1 text-[11px] text-slate-600 uppercase">
                    Area of Implementation:
                  </h4>
                  <div>
                    <span className="text-slate-400 uppercase font-bold block">Minifactory:</span>
                    <span className="text-slate-900 font-bold">{selectedKaizen.minifactory}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-bold block">Location:</span>
                    <span className="text-slate-800 font-bold">{selectedKaizen.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-bold block">Machine/Station:</span>
                    <span className="text-slate-800 font-bold">{selectedKaizen.machine}</span>
                  </div>
                </div>

              </div>

              {/* PHOTOS PROOF BLOCKS REPLICA (Clickable for full view lightbox) */}
              <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-300">
                <div className="md:col-span-5 border-r border-slate-300 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase font-mono">Photos : BEFORE STATUS</h4>
                    <span className="text-[9px] font-bold text-indigo-600 font-mono flex items-center space-x-1">
                      <ZoomIn className="w-3 h-3" />
                      <span>Click to enlarge</span>
                    </span>
                  </div>
                  <div
                    onClick={() => setFullViewPhoto({
                      type: 'before',
                      url: selectedKaizen.photoBefore,
                      title: 'Before Improvement Status'
                    })}
                    className="bg-slate-50 rounded-lg aspect-video flex items-center justify-center p-1 border border-slate-200 overflow-hidden cursor-pointer group relative hover:border-indigo-400 hover:shadow-md transition"
                  >
                    <img
                      src={selectedKaizen.photoBefore}
                      alt="Before"
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold font-mono space-x-1.5 backdrop-blur-[1px]">
                      <Maximize2 className="w-4 h-4 text-white" />
                      <span>Full View Photo</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-4 border-r border-slate-300 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase font-mono">Photos : AFTER IMPROVEMENT</h4>
                    <span className="text-[9px] font-bold text-indigo-600 font-mono flex items-center space-x-1">
                      <ZoomIn className="w-3 h-3" />
                      <span>Click to enlarge</span>
                    </span>
                  </div>
                  <div
                    onClick={() => setFullViewPhoto({
                      type: 'after',
                      url: selectedKaizen.photoAfter,
                      title: 'After Improvement Status'
                    })}
                    className="bg-slate-50 rounded-lg aspect-video flex items-center justify-center p-1 border border-slate-200 overflow-hidden cursor-pointer group relative hover:border-emerald-400 hover:shadow-md transition"
                  >
                    <img
                      src={selectedKaizen.photoAfter}
                      alt="After"
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold font-mono space-x-1.5 backdrop-blur-[1px]">
                      <Maximize2 className="w-4 h-4 text-white" />
                      <span>Full View Photo</span>
                    </div>
                  </div>
                </div>

                {/* PQCDSM Benefits block */}
                <div className="md:col-span-3 p-3 bg-slate-50/70 font-mono flex flex-col justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200 pb-1 mb-2">Benefits Metric :</h4>
                    <div className="grid grid-cols-6 gap-1 text-center font-bold">
                      {['p', 'q', 'c', 'd', 's', 'm'].map(key => {
                        const active = selectedKaizen.benefits?.[key as keyof typeof selectedKaizen.benefits];
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

                  <div className="text-[8px] text-slate-400 leading-tight border-t border-slate-200 pt-1.5 mt-2">
                    P-Productivity | Q-Quality | C-Cost | D-Delivery | S-Safety | M-Morale
                  </div>
                </div>
              </div>

              {/* Bottom Result Description Replica */}
              <div className="p-4 bg-slate-50/20 text-xs">
                <span className="font-bold text-slate-500 uppercase font-mono block mb-1">Result :</span>
                <p className="text-slate-700 leading-relaxed font-sans font-medium whitespace-pre-line">
                  {selectedKaizen.result || "No specific outcome summary documented yet."}
                </p>
              </div>

              {/* Committee Remarks Log (If existing) */}
              {selectedKaizen.remark && (
                <div className="p-3 bg-amber-50 border-t border-slate-300 text-xs">
                  <span className="font-bold text-amber-800 uppercase font-mono block mb-0.5">Review Committee Remark :</span>
                  <p className="text-amber-900 italic font-medium">
                    "{selectedKaizen.remark}"
                  </p>
                </div>
              )}

            </div>

            {/* COMMITTEE MEETING CONTROL DECISION PANEL */}
            <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-200 pb-2 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase font-mono">
                  💬 COMMITTEE DECISION PORTAL (DISCUSSION & VERIFICATION)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Decision type selection (Kaizen vs Good Point) */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    1. CLASSIFICATION DECISION <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      id="decision-kaizen-btn"
                      onClick={() => {
                        setClassification('Kaizen');
                        setStatus('Approved');
                      }}
                      className={`flex items-center justify-center space-x-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                        classification === 'Kaizen'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Award className="w-4 h-4" />
                      <span>🏆 KAIZEN</span>
                    </button>
                    <button
                      type="button"
                      id="decision-goodpoint-btn"
                      onClick={() => {
                        setClassification('Good Point');
                        setStatus('Good Point');
                      }}
                      className={`flex items-center justify-center space-x-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                        classification === 'Good Point'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Lightbulb className="w-4 h-4" />
                      <span>💡 GOOD POINT</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setClassification('None');
                        setStatus('Rejected');
                      }}
                      className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border text-xs font-bold transition ${
                        status === 'Rejected'
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject/Decline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClassification('Pending');
                        setStatus('Pending');
                      }}
                      className={`flex items-center justify-center space-x-1.5 p-2 rounded-lg border text-xs font-bold transition ${
                        status === 'Pending'
                          ? 'bg-slate-600 text-white border-slate-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Hold Pending</span>
                    </button>
                  </div>
                </div>

                {/* Savings input and Sign-off */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                      2. AUDITED SAVINGS VERIFIED (₹ / year)
                    </label>
                    <div className="flex rounded-xl shadow-xs">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-slate-500 text-xs font-bold font-mono">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={costSave}
                        onChange={(e) => setCostSave(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-r-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Verified Sign-off</label>
                      <input
                        type="text"
                        value={verifiedBy}
                        onChange={(e) => setVerifiedBy(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-lg p-1 px-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Approved Sign-off</label>
                      <input
                        type="text"
                        value={approvedBy}
                        onChange={(e) => setApprovedBy(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-lg p-1 px-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Committee Remarks (Appended to spreadsheet columns) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  3. COMMITTEE DISCUSSION REMARKS / COMMENTS
                </label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Annual electrical savings verified by Plant HSE team. Recommended as factory standard practice."
                />
              </div>

              {/* Editable PQCDSM override during committee discussion */}
              <div>
                <span className="block text-xs font-bold text-slate-600 uppercase mb-2">4. Adjust/Verify Benefits (PQCDSM Checklist) :</span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    { key: 'p', label: 'Productivity' },
                    { key: 'q', label: 'Quality' },
                    { key: 'c', label: 'Cost' },
                    { key: 'd', label: 'Delivery' },
                    { key: 's', label: 'Safety' },
                    { key: 'm', label: 'Morale' }
                  ].map(b => (
                    <label key={b.key} className="flex items-center space-x-1.5 bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 select-none cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={benefits[b.key as keyof typeof benefits]}
                        onChange={(e) => setBenefits(prev => ({ ...prev, [b.key]: e.target.checked }))}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-bold text-slate-700 font-mono text-[10px] uppercase">{b.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Log Decision Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 gap-3">
                {successMessage ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl animate-fade-in">
                    ✓ {successMessage}
                  </div>
                ) : (
                  <div />
                )}
                <button
                  type="button"
                  onClick={handleSaveReview}
                  className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm self-end"
                >
                  <Save className="w-4 h-4 text-emerald-400" />
                  <span>💾 LOG BOARD DECISION & APPROVE</span>
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Full View Lightbox Modal for Before / After Photos */}
      {fullViewPhoto && selectedKaizen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in"
          onClick={() => setFullViewPhoto(null)}
        >
          {/* Lightbox Header */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white border-b border-slate-800 pb-3.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3">
              <span className={`px-2.5 py-1 text-[10px] font-black rounded-md font-mono uppercase tracking-wider ${
                fullViewPhoto.type === 'before'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {fullViewPhoto.type === 'before' ? 'BEFORE STATUS PHOTO' : 'AFTER IMPROVEMENT PHOTO'}
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-200 font-mono">
                  [{selectedKaizen.srNo}] {selectedKaizen.title}
                </h3>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                  Minifactory: {selectedKaizen.minifactory} • Station: {selectedKaizen.machine}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFullViewPhoto(null)}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer shrink-0"
              title="Close viewer (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lightbox Main Image Container */}
          <div
            className="flex-1 w-full max-w-5xl my-4 flex items-center justify-center overflow-hidden relative group"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullViewPhoto.url}
              alt={fullViewPhoto.title}
              className="max-h-[72vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Lightbox Footer & Switchers */}
          <div
            className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-xs gap-3 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-slate-300 font-sans text-xs truncate max-w-xl">
              <span className="font-mono font-bold text-[10px] text-slate-400 uppercase mr-1.5">
                {fullViewPhoto.type === 'before' ? 'Problem:' : 'Counter Measure:'}
              </span>
              {fullViewPhoto.type === 'before' ? selectedKaizen.problemBefore : selectedKaizen.counterMeasureAfter}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setFullViewPhoto({
                  type: 'before',
                  url: selectedKaizen.photoBefore,
                  title: 'Before Improvement Status'
                })}
                className={`px-3.5 py-2 rounded-xl font-bold font-mono text-[11px] transition flex items-center space-x-1.5 ${
                  fullViewPhoto.type === 'before'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>📷 View Before Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setFullViewPhoto({
                  type: 'after',
                  url: selectedKaizen.photoAfter,
                  title: 'After Improvement Status'
                })}
                className={`px-3.5 py-2 rounded-xl font-bold font-mono text-[11px] transition flex items-center space-x-1.5 ${
                  fullViewPhoto.type === 'after'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>✨ View After Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KAIZEN PRESENTATION MODE OVERLAY */}
      {presentingKaizen && (
        <KaizenPresentationMode
          kaizen={presentingKaizen}
          allKaizens={kaizens}
          onClose={() => setPresentingKaizen(null)}
          onUpdateKaizen={onUpdateKaizen}
          onSelectKaizen={(id) => {
            const found = kaizens.find(k => k.id === id);
            if (found) {
              setSelectedId(id);
              setPresentingKaizen(found);
            }
          }}
        />
      )}

    </div>
  );
}
