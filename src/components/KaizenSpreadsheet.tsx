import React, { useState } from 'react';
import { Kaizen } from '../types';
import { Search, Filter, Download, ArrowUpDown, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { formatIndianRupees, formatIndianRupeesCompact } from '../utils';

interface KaizenSpreadsheetProps {
  kaizens: Kaizen[];
  onSelectKaizen: (k: Kaizen) => void;
}

export default function KaizenSpreadsheet({ kaizens, onSelectKaizen }: KaizenSpreadsheetProps) {
  const [search, setSearch] = useState('');
  const [filterMinifactory, setFilterMinifactory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterClassification, setFilterClassification] = useState('All');
  
  // Mobile expand rows tracker
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Filter kaizens
  const filteredKaizens = kaizens.filter(k => {
    const matchesSearch = 
      k.title.toLowerCase().includes(search.toLowerCase()) ||
      k.srNo.toLowerCase().includes(search.toLowerCase()) ||
      k.ideaBy.toLowerCase().includes(search.toLowerCase()) ||
      k.problemBefore.toLowerCase().includes(search.toLowerCase());

    const matchesMinifactory = filterMinifactory === 'All' || k.minifactory === filterMinifactory;
    const matchesStatus = filterStatus === 'All' || k.status === filterStatus;
    const matchesClassification = filterClassification === 'All' || k.classification === filterClassification;

    return matchesSearch && matchesMinifactory && matchesStatus && matchesClassification;
  });

  const getPQCDSMString = (benefits: Kaizen['benefits']) => {
    if (!benefits) return '-';
    return Object.entries(benefits)
      .filter(([_, active]) => active)
      .map(([key]) => key.toUpperCase())
      .join(', ') || 'None';
  };

  const handleExportCSV = () => {
    // Generate simple CSV content mimicking Excel structure
    const headers = [
      "Kaizen SR. No", "Month", "Suggestion date", "Idea / Kaizen", "Problem/ Before Status",
      "Counter Measure/ After Improvement", "Location", "Station", "Responsibility", 
      "Closing target date", "Idea Implemented date", "Manufactory", "Cost save", 
      "Benefits in PQCDSM", "IDEA By", "Implemented -By", "Status", "Kaizen / Good Point", "Remark"
    ];

    const rows = filteredKaizens.map(k => [
      k.srNo, k.month, k.suggestionDate, `"${k.title.replace(/"/g, '""')}"`, 
      `"${k.problemBefore.replace(/"/g, '""')}"`, `"${k.counterMeasureAfter.replace(/"/g, '""')}"`,
      k.location, k.machine, k.implementedBy || k.ideaBy, k.closingTargetDate, k.implementedDate,
      k.minifactory, k.costSave, getPQCDSMString(k.benefits), k.ideaBy, k.implementedBy,
      k.status, k.classification, `"${k.remark.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Kaizen_Tracking_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      
      {/* Search, Filter & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-800 focus:bg-white transition"
            placeholder="Search Serial No, title, operators, problem details..."
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          <div>
            <select
              value={filterMinifactory}
              onChange={(e) => setFilterMinifactory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="All">🏭 All Minifactories</option>
              <option value="MF1">MF1</option>
              <option value="MF2">MF2</option>
              <option value="MF3">MF3</option>
              <option value="Machining">Machining</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="All">🚦 All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Good Point">Good Point</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div>
            <select
              value={filterClassification}
              onChange={(e) => setFilterClassification(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="All">🏆 All Decisions</option>
              <option value="Kaizen">Kaizen Only</option>
              <option value="Good Point">Good Point Only</option>
              <option value="Pending">Pending Review</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ml-auto md:ml-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Export Excel</span>
          </button>
        </div>

      </div>

      {/* Spreadsheet Main Container (Scrollable table on desktop, hybrid cards on mobile) */}
      <div className="bg-white border border-slate-250 rounded-2xl shadow-sm overflow-hidden">
        
        {/* DESKTOP EXCEL TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[11px] text-left border-collapse font-sans min-w-[1800px]">
            <thead>
              <tr className="bg-[#3b82f6] text-white border-b border-slate-300 font-semibold tracking-wider">
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Kaizen SR. No</th>
                <th className="px-2 py-2.5 border-r border-slate-300 w-[60px]">Month</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[90px]">Suggestion date</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[160px]">Idea / Kaizen</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[200px]">Problem/ Before Status</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[200px]">Counter Measure / After</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Location</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Station</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Responsibility</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[90px]">Closing target date</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[90px]">Implemented date</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[110px]">Manufactory</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Cost save (₹)</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Benefits (PQCDSM)</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">IDEA By</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[100px]">Implemented-By</th>
                <th className="px-3 py-2.5 border-r border-slate-300 w-[80px]">Status</th>
                {/* Yellow Highlighted Decision Header */}
                <th className="px-3 py-2.5 border-r border-slate-300 bg-[#fef08a] text-amber-900 font-extrabold w-[110px]">Kaizen / Good Point</th>
                <th className="px-3 py-2.5 w-[160px]">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredKaizens.length === 0 ? (
                <tr>
                  <td colSpan={19} className="px-6 py-12 text-center text-slate-400 font-medium text-xs bg-slate-50">
                    No matching Kaizen entries found in database records.
                  </td>
                </tr>
              ) : (
                filteredKaizens.map((k) => (
                  <tr
                    key={k.id}
                    onClick={() => onSelectKaizen(k)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 border-r border-slate-200 font-mono font-bold text-slate-900 bg-slate-50/50">
                      {k.srNo}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-200 text-slate-500 font-medium">
                      {k.month}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-600">
                      {k.suggestionDate}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-bold text-slate-800">
                      {k.title}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-600 line-clamp-2 min-h-[40px] whitespace-pre-wrap leading-tight">
                      {k.problemBefore}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-600 line-clamp-2 min-h-[40px] whitespace-pre-wrap leading-tight">
                      {k.counterMeasureAfter}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-600 font-medium">
                      {k.location}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-600">
                      {k.machine}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-700 truncate max-w-[100px]">
                      {k.implementedBy || k.ideaBy}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-500">
                      {k.closingTargetDate}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-mono text-slate-500">
                      {k.implementedDate}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-semibold text-slate-700">
                      {k.minifactory}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-mono font-bold text-slate-900 text-right pr-4">
                      {k.costSave > 0 ? formatIndianRupees(k.costSave) : '-'}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200">
                      <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-black font-mono">
                        {getPQCDSMString(k.benefits)}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-500 font-medium">
                      {k.ideaBy}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-slate-500 truncate max-w-[100px]">
                      {k.implementedBy}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-xs text-[9px] font-extrabold uppercase font-mono ${
                        k.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : k.status === 'Good Point'
                          ? 'bg-emerald-50 text-emerald-700'
                          : k.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {k.status}
                      </span>
                    </td>
                    {/* Yellow Highlighted Decision Body Column */}
                    <td className="px-3 py-2 border-r border-slate-200 bg-[#fef9c3] font-bold text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono tracking-wide ${
                        k.classification === 'Kaizen'
                          ? 'bg-emerald-600 text-white'
                          : k.classification === 'Good Point'
                          ? 'bg-amber-500 text-white'
                          : k.classification === 'None'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {k.classification}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 italic max-w-[160px] truncate">
                      {k.remark || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE & TABLET RESPONSIVE COMPACT CARD VIEW */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredKaizens.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching records found.
            </div>
          ) : (
            filteredKaizens.map(k => {
              const isExpanded = expandedRowId === k.id;
              return (
                <div key={k.id} className="p-4 space-y-3">
                  
                  {/* Top line with serial and badges */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">{k.srNo}</span>
                    <div className="flex space-x-1.5">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-sm uppercase font-mono ${
                        k.status === 'Approved' || k.status === 'Good Point'
                          ? 'bg-emerald-100 text-emerald-800'
                          : k.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {k.status}
                      </span>
                      {k.classification !== 'Pending' && k.classification !== 'None' && (
                        <span className="px-2 py-0.5 text-[9px] font-black rounded-sm bg-yellow-200 text-yellow-900 uppercase font-mono">
                          {k.classification}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title and Operator */}
                  <div onClick={() => onSelectKaizen(k)} className="cursor-pointer">
                    <h4 className="text-sm font-bold text-slate-800 leading-snug">{k.title}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">Logged by: {k.ideaBy} • {k.minifactory}</p>
                  </div>

                  {/* Accordion expand block */}
                  <button
                    type="button"
                    onClick={() => setExpandedRowId(isExpanded ? null : k.id)}
                    className="w-full py-1 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center space-x-1.5 text-[10px] font-bold text-slate-600"
                  >
                    <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-2 border border-slate-100 divide-y divide-slate-200/60 font-medium">
                      <div className="pt-1.5 first:pt-0">
                        <span className="text-slate-400 block font-bold text-[9px] font-mono uppercase">Problem:</span>
                        <p className="text-slate-700 whitespace-pre-wrap leading-normal">{k.problemBefore}</p>
                      </div>
                      <div className="pt-2">
                        <span className="text-slate-400 block font-bold text-[9px] font-mono uppercase">Countermeasure:</span>
                        <p className="text-slate-700 whitespace-pre-wrap leading-normal">{k.counterMeasureAfter}</p>
                      </div>
                      <div className="pt-2 grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-400 font-bold uppercase block">Station:</span>
                          <span className="text-slate-800">{k.machine || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold uppercase block">Location:</span>
                          <span className="text-slate-800">{k.location || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold uppercase block">Cost Savings:</span>
                          <span className="text-emerald-700 font-bold">{formatIndianRupees(k.costSave)}/yr</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold uppercase block">PQCDSM Benefits:</span>
                          <span className="text-slate-800">{getPQCDSMString(k.benefits)}</span>
                        </div>
                      </div>
                      {k.remark && (
                        <div className="pt-2">
                          <span className="text-amber-800 block font-bold text-[9px] font-mono uppercase">Committee Remark:</span>
                          <p className="text-amber-900 italic">{k.remark}</p>
                        </div>
                      )}
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onSelectKaizen(k)}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 text-white rounded text-[10px] font-bold"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect Sheet</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
