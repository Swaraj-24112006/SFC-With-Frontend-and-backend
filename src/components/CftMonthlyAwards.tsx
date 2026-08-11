import React, { useState } from 'react';
import { Kaizen, PpsrReport } from '../types';
import { 
  Trophy, 
  Award, 
  Medal, 
  Vote, 
  CheckCircle2, 
  Users, 
  Calendar, 
  Sparkles, 
  TrendingUp, 
  Printer, 
  X, 
  Plus, 
  UserCheck, 
  FileText, 
  ChevronRight,
  ShieldCheck,
  Building,
  DollarSign,
  Lightbulb,
  Compass,
  Check,
  Star
} from 'lucide-react';
import { formatIndianRupees } from '../utils';

interface CftMonthlyAwardsProps {
  kaizens: Kaizen[];
  ppsrReports: PpsrReport[];
  onUpdateKaizen?: (id: string, updatedFields: Partial<Kaizen>) => void;
  onUpdatePpsrReport?: (id: string, updatedFields: Partial<PpsrReport>) => void;
}

interface VoteRecord {
  voterName: string;
  voterRole: string;
  kaizenVotes: { kaizenId: string; rank: 1 | 2 | 3 }[];
  ppsrVotes: { ppsrId: string; rank: 1 | 2 | 3 }[];
}

export default function CftMonthlyAwards({
  kaizens,
  ppsrReports,
  onUpdateKaizen,
  onUpdatePpsrReport
}: CftMonthlyAwardsProps) {
  // Selected Month
  const [selectedMonth, setSelectedMonth] = useState('July 2026');
  const [activeCategory, setActiveCategory] = useState<'kaizen' | 'ppsr'>('kaizen');

  // Meeting Details
  const [meetingDate, setMeetingDate] = useState('2026-07-28');
  const [chairperson, setChairperson] = useState('Amit Mehta (Kaizen & Quality Lead)');
  const [attendees, setAttendees] = useState('Sunita Rao, Rajesh Patil, Arjun Mehra, Vijay Deshmukh, Sanjay Patil, Rahul Sharma');
  const [meetingNotes, setMeetingNotes] = useState('Monthly Cross-Functional Team (CFT) review meeting held to evaluate all approved Kaizens and closed PPSR reports for July 2026. CFT members discussed cost impact, safety gains, and process standardization before casting votes.');

  // Default CFT Member list
  const [cftMembers, setCftMembers] = useState([
    { name: 'Amit Mehta', role: 'Kaizen & Quality Lead' },
    { name: 'Rajesh Patil', role: 'Plant Supervisor' },
    { name: 'Sunita Rao', role: 'Quality Lead' },
    { name: 'Arjun Mehra', role: 'Automation Lead' },
    { name: 'Vijay Deshmukh', role: 'Area Leader' },
    { name: 'Sanjay Patil', role: 'Safety Specialist' },
    { name: 'Rahul Sharma', role: 'Operator Representative' }
  ]);

  // Current active voter selected in meeting
  const [activeVoterIndex, setActiveVoterIndex] = useState(0);

  // In-memory Votes
  const [votes, setVotes] = useState<VoteRecord[]>([
    {
      voterName: 'Amit Mehta',
      voterRole: 'Kaizen & Quality Lead',
      kaizenVotes: [
        { kaizenId: 'kz-1', rank: 1 }, // 3 pts
        { kaizenId: 'kz-4', rank: 2 }, // 2 pts
        { kaizenId: 'kz-2', rank: 3 }  // 1 pt
      ],
      ppsrVotes: [
        { ppsrId: 'ppsr-1', rank: 1 },
        { ppsrId: 'ppsr-2', rank: 2 },
        { ppsrId: 'ppsr-3', rank: 3 }
      ]
    },
    {
      voterName: 'Rajesh Patil',
      voterRole: 'Plant Supervisor',
      kaizenVotes: [
        { kaizenId: 'kz-4', rank: 1 },
        { kaizenId: 'kz-1', rank: 2 },
        { kaizenId: 'kz-3', rank: 3 }
      ],
      ppsrVotes: [
        { ppsrId: 'ppsr-1', rank: 1 },
        { ppsrId: 'ppsr-3', rank: 2 },
        { ppsrId: 'ppsr-2', rank: 3 }
      ]
    },
    {
      voterName: 'Sunita Rao',
      voterRole: 'Quality Lead',
      kaizenVotes: [
        { kaizenId: 'kz-2', rank: 1 },
        { kaizenId: 'kz-1', rank: 2 },
        { kaizenId: 'kz-4', rank: 3 }
      ],
      ppsrVotes: [
        { ppsrId: 'ppsr-1', rank: 1 },
        { ppsrId: 'ppsr-2', rank: 2 },
        { ppsrId: 'ppsr-3', rank: 3 }
      ]
    }
  ]);

  // Finalized status
  const [isFinalized, setIsFinalized] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState<{
    type: 'Kaizen' | 'PPSR';
    rank: 1 | 2 | 3;
    title: string;
    winnerName: string;
    area: string;
    costSaveText: string;
    srNo: string;
  } | null>(null);

  // New CFT member modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');

  // Toast message
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Filter approved Kaizens and approved/closed PPSRs
  const approvedKaizens = kaizens.filter(k => k.status === 'Approved' || k.status === 'Good Point');
  const eligiblePpsrs = ppsrReports.filter(p => p.status === 'Closed' || p.status === 'In-Progress');

  // Compute points for Kaizens
  // Rank 1 = 3 pts, Rank 2 = 2 pts, Rank 3 = 1 pt
  const getKaizenScore = (kaizenId: string) => {
    let score = 0;
    votes.forEach(v => {
      const found = v.kaizenVotes.find(kv => kv.kaizenId === kaizenId);
      if (found) {
        if (found.rank === 1) score += 3;
        else if (found.rank === 2) score += 2;
        else if (found.rank === 3) score += 1;
      }
    });
    return score;
  };

  // Compute points for PPSRs
  const getPpsrScore = (ppsrId: string) => {
    let score = 0;
    votes.forEach(v => {
      const found = v.ppsrVotes.find(pv => pv.ppsrId === ppsrId);
      if (found) {
        if (found.rank === 1) score += 3;
        else if (found.rank === 2) score += 2;
        else if (found.rank === 3) score += 1;
      }
    });
    return score;
  };

  // Ranked Kaizens
  const sortedKaizens = [...approvedKaizens].sort((a, b) => getKaizenScore(b.id) - getKaizenScore(a.id));
  const topThreeKaizens = sortedKaizens.slice(0, 3);

  // Ranked PPSRs
  const sortedPpsrs = [...eligiblePpsrs].sort((a, b) => getPpsrScore(b.id) - getPpsrScore(a.id));
  const topThreePpsrs = sortedPpsrs.slice(0, 3);

  // Cast vote by current active voter
  const handleCastVote = (category: 'kaizen' | 'ppsr', itemId: string, rank: 1 | 2 | 3) => {
    const activeMember = cftMembers[activeVoterIndex];
    if (!activeMember) return;

    setVotes(prevVotes => {
      const existingVoteIdx = prevVotes.findIndex(v => v.voterName === activeMember.name);
      let updatedVotes = [...prevVotes];

      if (existingVoteIdx === -1) {
        const newRecord: VoteRecord = {
          voterName: activeMember.name,
          voterRole: activeMember.role,
          kaizenVotes: category === 'kaizen' ? [{ kaizenId: itemId, rank }] : [],
          ppsrVotes: category === 'ppsr' ? [{ ppsrId: itemId, rank }] : []
        };
        updatedVotes.push(newRecord);
      } else {
        const voterRec = { ...updatedVotes[existingVoteIdx] };
        if (category === 'kaizen') {
          // Remove any existing rank matching this rank OR matching this item
          let kList = voterRec.kaizenVotes.filter(kv => kv.kaizenId !== itemId && kv.rank !== rank);
          kList.push({ kaizenId: itemId, rank });
          voterRec.kaizenVotes = kList;
        } else {
          let pList = voterRec.ppsrVotes.filter(pv => pv.ppsrId !== itemId && pv.rank !== rank);
          pList.push({ ppsrId: itemId, rank });
          voterRec.ppsrVotes = pList;
        }
        updatedVotes[existingVoteIdx] = voterRec;
      }

      return updatedVotes;
    });

    const rankLabel = rank === 1 ? '🥇 1st Choice (3 pts)' : rank === 2 ? '🥈 2nd Choice (2 pts)' : '🥉 3rd Choice (1 pt)';
    showToast(`Vote recorded for ${activeMember.name}: ${rankLabel}`);
  };

  // Get current voter's selection for an item
  const getCurrentVoterRank = (category: 'kaizen' | 'ppsr', itemId: string): 1 | 2 | 3 | null => {
    const activeMember = cftMembers[activeVoterIndex];
    if (!activeMember) return null;
    const v = votes.find(x => x.voterName === activeMember.name);
    if (!v) return null;
    if (category === 'kaizen') {
      const match = v.kaizenVotes.find(k => k.kaizenId === itemId);
      return match ? match.rank : null;
    } else {
      const match = v.ppsrVotes.find(p => p.ppsrId === itemId);
      return match ? match.rank : null;
    }
  };

  // Add new CFT member
  const handleAddCftMember = () => {
    if (!newMemberName.trim()) return;
    const newMember = {
      name: newMemberName.trim(),
      role: newMemberRole.trim() || 'CFT Committee Member'
    };
    setCftMembers(prev => [...prev, newMember]);
    setActiveVoterIndex(cftMembers.length); // auto switch to new member
    setNewMemberName('');
    setNewMemberRole('');
    setShowAddMemberModal(false);
    showToast(`Added ${newMember.name} to CFT Voting Panel.`);
  };

  // Finalize Awards
  const handleFinalizeMeeting = () => {
    setIsFinalized(true);

    // Optionally update remark of top 3 Kaizens and PPSRs
    if (onUpdateKaizen && topThreeKaizens.length > 0) {
      topThreeKaizens.forEach((k, idx) => {
        const medalName = idx === 0 ? '🏆 Gold Award (1st Prize)' : idx === 1 ? '🥈 Silver Award (2nd Prize)' : '🥉 Bronze Award (3rd Prize)';
        onUpdateKaizen(k.id, {
          remark: `[CFT MONTHLY AWARD - ${selectedMonth}] Selected as ${medalName} with ${getKaizenScore(k.id)} total CFT votes!`
        });
      });
    }

    if (onUpdatePpsrReport && topThreePpsrs.length > 0) {
      topThreePpsrs.forEach((p, idx) => {
        const medalName = idx === 0 ? '🏆 Gold Award (1st Prize)' : idx === 1 ? '🥈 Silver Award (2nd Prize)' : '🥉 Bronze Award (3rd Prize)';
        onUpdatePpsrReport(p.id, {
          remarks: `[CFT MONTHLY AWARD - ${selectedMonth}] Selected as ${medalName} with ${getPpsrScore(p.id)} total CFT votes!`
        });
      });
    }

    showToast(`🏆 Official Monthly CFT Awards for ${selectedMonth} have been finalized and declared!`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Toast alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-emerald-400 border border-emerald-500 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold font-mono animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white p-6 rounded-3xl shadow-lg border border-indigo-900/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>CFT Monthly Excellence Program</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                isFinalized ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {isFinalized ? '✓ Awards Finalized & Published' : '⚡ Voting Session Active'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white mt-2">
              Monthly CFT Review & Best Awards Voting
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl font-sans">
              Cross-Functional Team (CFT) monthly assembly where all approved Kaizens and closed PPSR problem-solving reports are presented. Committee members cast votes to select the <strong>Top 3 Best Kaizens</strong> and <strong>Top 3 Best PPSRs</strong> for monthly honors and monetary rewards.
            </p>
          </div>

          {/* Month selector & Finalize button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white text-xs font-bold font-mono focus:outline-none cursor-pointer"
              >
                <option value="July 2026" className="bg-slate-900 text-white">July 2026 Meeting</option>
                <option value="August 2026" className="bg-slate-900 text-white">August 2026 Meeting</option>
                <option value="June 2026" className="bg-slate-900 text-white">June 2026 Meeting</option>
              </select>
            </div>

            {!isFinalized ? (
              <button
                type="button"
                onClick={handleFinalizeMeeting}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black font-mono text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center space-x-2 border border-amber-400 cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                <span>FINALIZE & DECLARE AWARDS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono text-xs rounded-2xl transition flex items-center justify-center space-x-2 border border-slate-700 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>PRINT CFT MEETING MINUTES</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CFT MEETING ATTENDEES & METADATA BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
              CFT Committee Assembly Details
            </h2>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Date: <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">
              Chairperson / Lead Moderator
            </label>
            <input
              type="text"
              value={chairperson}
              onChange={(e) => setChairperson(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">
              Cross-Functional Team Attendees
            </label>
            <input
              type="text"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* TOP 3 WINNERS LEADERBOARD PREVIEW */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-extrabold uppercase font-mono tracking-wider text-amber-400">
                🏆 OFFICIAL TOP 3 CFT WINNERS ({selectedMonth})
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Top 3 Kaizens & Top 3 PPSRs decided by CFT majority voting tallies
            </p>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveCategory('kaizen')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center space-x-2 ${
                activeCategory === 'kaizen'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>💡 TOP 3 KAIZENS ({sortedKaizens.length})</span>
            </button>
            <button
              onClick={() => setActiveCategory('ppsr')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center space-x-2 ${
                activeCategory === 'ppsr'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>🧠 TOP 3 PPSRS ({sortedPpsrs.length})</span>
            </button>
          </div>
        </div>

        {/* TOP 3 PODIUM CARDS */}
        {activeCategory === 'kaizen' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((rankIndex) => {
              const item = topThreeKaizens[rankIndex];
              const score = item ? getKaizenScore(item.id) : 0;
              const rank = (rankIndex + 1) as 1 | 2 | 3;
              const titleBadge = rank === 1 ? '🥇 1st Prize (Gold Award)' : rank === 2 ? '🥈 2nd Prize (Silver Award)' : '🥉 3rd Prize (Bronze Award)';
              const badgeBg = rank === 1 ? 'from-amber-500 to-yellow-600 border-amber-400 text-slate-950' : rank === 2 ? 'from-slate-300 to-slate-400 border-slate-200 text-slate-950' : 'from-amber-700 to-amber-800 border-amber-600 text-white';
              const cashPrize = rank === 1 ? '₹5,000 + Gold Trophy' : rank === 2 ? '₹3,000 + Silver Shield' : '₹1,500 + Medal';

              return (
                <div
                  key={rankIndex}
                  className={`bg-slate-950/80 border rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition ${
                    rank === 1 ? 'border-amber-500/60 ring-2 ring-amber-500/20' : 'border-slate-800'
                  }`}
                >
                  <div>
                    {/* Rank Badge Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-black font-mono uppercase tracking-wider bg-gradient-to-r ${badgeBg} shadow-md`}>
                        {titleBadge}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {score} Votes
                      </span>
                    </div>

                    {item ? (
                      <div className="space-y-3">
                        <div className="text-[10px] text-slate-500 font-mono font-bold">
                          ID: {item.srNo} • {item.month}
                        </div>
                        <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                          {item.title}
                        </h3>

                        <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5 font-sans">
                          <div className="flex justify-between">
                            <span className="text-slate-400 text-[10px] font-mono">Idea Creator:</span>
                            <span className="font-bold text-emerald-400">{item.ideaBy}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 text-[10px] font-mono">Area / Station:</span>
                            <span className="font-bold text-slate-200 truncate max-w-[150px]">{item.minifactory} • {item.location}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-800">
                            <span className="text-slate-400 text-[10px] font-mono">Verified Savings:</span>
                            <span className="font-mono font-bold text-amber-400">{formatIndianRupees(item.costSave)}/yr</span>
                          </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[11px] text-amber-300 font-mono flex items-center justify-between">
                          <span>Reward Package:</span>
                          <span className="font-bold text-amber-400">{cashPrize}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-600 italic">
                        No Kaizen voted for position #{rank} yet.
                      </div>
                    )}
                  </div>

                  {item && (
                    <button
                      type="button"
                      onClick={() => setShowCertificateModal({
                        type: 'Kaizen',
                        rank: rank,
                        title: item.title,
                        winnerName: item.ideaBy,
                        area: `${item.minifactory} (${item.location})`,
                        costSaveText: `${formatIndianRupees(item.costSave)} / year`,
                        srNo: item.srNo
                      })}
                      className="mt-4 w-full py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-indigo-400" />
                      <span>VIEW AWARD CERTIFICATE</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((rankIndex) => {
              const item = topThreePpsrs[rankIndex];
              const score = item ? getPpsrScore(item.id) : 0;
              const rank = (rankIndex + 1) as 1 | 2 | 3;
              const titleBadge = rank === 1 ? '🥇 1st Prize (Gold Award)' : rank === 2 ? '🥈 2nd Prize (Silver Award)' : '🥉 3rd Prize (Bronze Award)';
              const badgeBg = rank === 1 ? 'from-amber-500 to-yellow-600 border-amber-400 text-slate-950' : rank === 2 ? 'from-slate-300 to-slate-400 border-slate-200 text-slate-950' : 'from-amber-700 to-amber-800 border-amber-600 text-white';
              const cashPrize = rank === 1 ? '₹10,000 + Gold Trophy' : rank === 2 ? '₹6,000 + Silver Shield' : '₹3,000 + Medal';

              return (
                <div
                  key={rankIndex}
                  className={`bg-slate-950/80 border rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition ${
                    rank === 1 ? 'border-amber-500/60 ring-2 ring-amber-500/20' : 'border-slate-800'
                  }`}
                >
                  <div>
                    {/* Rank Badge Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-black font-mono uppercase tracking-wider bg-gradient-to-r ${badgeBg} shadow-md`}>
                        {titleBadge}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {score} Votes
                      </span>
                    </div>

                    {item ? (
                      <div className="space-y-3">
                        <div className="text-[10px] text-slate-500 font-mono font-bold">
                          ID: {item.ppsrNo}
                        </div>
                        <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                          {item.title}
                        </h3>

                        <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5 font-sans">
                          <div className="flex justify-between">
                            <span className="text-slate-400 text-[10px] font-mono">Lead Problem Solver:</span>
                            <span className="font-bold text-violet-400">{item.leadOwner || item.projectLeader}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 text-[10px] font-mono">Plant / Station:</span>
                            <span className="font-bold text-slate-200 truncate max-w-[150px]">{item.plant || 'Main Plant'}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-800">
                            <span className="text-slate-400 text-[10px] font-mono">Monthly Savings:</span>
                            <span className="font-mono font-bold text-amber-400">{formatIndianRupees(item.costSavePerMonth || 250000)}/mo</span>
                          </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[11px] text-amber-300 font-mono flex items-center justify-between">
                          <span>Reward Package:</span>
                          <span className="font-bold text-amber-400">{cashPrize}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-600 italic">
                        No PPSR voted for position #{rank} yet.
                      </div>
                    )}
                  </div>

                  {item && (
                    <button
                      type="button"
                      onClick={() => setShowCertificateModal({
                        type: 'PPSR',
                        rank: rank,
                        title: item.title,
                        winnerName: item.leadOwner || item.projectLeader || 'CFT Team',
                        area: item.plant || 'Manufacturing Plant',
                        costSaveText: `${formatIndianRupees(item.costSavePerMonth || 250000)} / month`,
                        srNo: item.ppsrNo
                      })}
                      className="mt-4 w-full py-2 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/30 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-violet-400" />
                      <span>VIEW AWARD CERTIFICATE</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VOTING CONTROL PANEL - SELECT VOTER AND CAST VOTES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase font-mono tracking-wide flex items-center space-x-2">
              <Vote className="w-5 h-5 text-indigo-600" />
              <span>🗳️ CFT MEMBER VOTING TERMINAL</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your CFT identity below, review the candidate Kaizens and PPSRs, and cast your 1st (3 pts), 2nd (2 pts), and 3rd (1 pt) choices.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddMemberModal(true)}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold font-mono rounded-xl transition flex items-center space-x-1.5 border border-slate-200 self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Add CFT Member</span>
          </button>
        </div>

        {/* SELECT ACTIVE VOTER BADGES */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
            1. Select Active CFT Voter Profile:
          </label>
          <div className="flex flex-wrap gap-2">
            {cftMembers.map((member, idx) => {
              const isActive = activeVoterIndex === idx;
              const voterHasCast = votes.some(v => v.voterName === member.name && (v.kaizenVotes.length > 0 || v.ppsrVotes.length > 0));

              return (
                <button
                  key={member.name}
                  type="button"
                  onClick={() => setActiveVoterIndex(idx)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md border border-slate-900'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  <UserCheck className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{member.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {member.role}
                  </span>
                  {voterHasCast && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Vote recorded" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CANDIDATE VOTING LISTS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase font-mono">
              2. Cast Votes for: {activeCategory === 'kaizen' ? '💡 Approved Kaizens' : '🧠 Closed / Active PPSRs'}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Currently voting as: <strong>{cftMembers[activeVoterIndex]?.name}</strong> ({cftMembers[activeVoterIndex]?.role})
            </span>
          </div>

          {activeCategory === 'kaizen' ? (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {approvedKaizens.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No approved Kaizens found in database yet.
                </div>
              ) : (
                approvedKaizens.map(k => {
                  const currentScore = getKaizenScore(k.id);
                  const voterRank = getCurrentVoterRank('kaizen', k.id);

                  return (
                    <div key={k.id} className="p-4 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold font-mono text-slate-400">{k.srNo}</span>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">
                            {k.classification}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 font-mono">
                            {k.minifactory} • {k.location}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{k.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          Idea By: <strong>{k.ideaBy}</strong> • Annual Savings: <strong>{formatIndianRupees(k.costSave)}/yr</strong>
                        </p>
                      </div>

                      {/* Vote Buttons */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="text-right mr-3 hidden sm:block font-mono">
                          <div className="text-xs font-bold text-slate-900">{currentScore} pts</div>
                          <div className="text-[9px] text-slate-400 uppercase">Total Score</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCastVote('kaizen', k.id, 1)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition flex items-center space-x-1 cursor-pointer ${
                            voterRank === 1
                              ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-400'
                              : 'bg-slate-100 hover:bg-amber-100 text-slate-700'
                          }`}
                        >
                          <span>🥇 1st Choice (+3)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCastVote('kaizen', k.id, 2)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition flex items-center space-x-1 cursor-pointer ${
                            voterRank === 2
                              ? 'bg-slate-400 text-slate-950 shadow-sm ring-2 ring-slate-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span>🥈 2nd Choice (+2)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCastVote('kaizen', k.id, 3)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition flex items-center space-x-1 cursor-pointer ${
                            voterRank === 3
                              ? 'bg-amber-700 text-white shadow-sm ring-2 ring-amber-600'
                              : 'bg-slate-100 hover:bg-amber-50 text-slate-700'
                          }`}
                        >
                          <span>🥉 3rd Choice (+1)</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {eligiblePpsrs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No eligible PPSRs found in database yet.
                </div>
              ) : (
                eligiblePpsrs.map(p => {
                  const currentScore = getPpsrScore(p.id);
                  const voterRank = getCurrentVoterRank('ppsr', p.id);

                  return (
                    <div key={p.id} className="p-4 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold font-mono text-slate-400">{p.ppsrNo}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            p.status === 'Closed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {p.status}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 font-mono">
                            {p.plant || 'Main Plant'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{p.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          Lead Owner: <strong>{p.leadOwner || p.projectLeader}</strong> • Monthly Savings: <strong>{formatIndianRupees(p.costSavePerMonth || 250000)}/mo</strong>
                        </p>
                      </div>

                      {/* Vote Buttons */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="text-right mr-3 hidden sm:block font-mono">
                          <div className="text-xs font-bold text-slate-900">{currentScore} pts</div>
                          <div className="text-[9px] text-slate-400 uppercase">Total Score</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCastVote('ppsr', p.id, 1)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition flex items-center space-x-1 cursor-pointer ${
                            voterRank === 1
                              ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-400'
                              : 'bg-slate-100 hover:bg-amber-100 text-slate-700'
                          }`}
                        >
                          <span>🥇 1st Choice (+3)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCastVote('ppsr', p.id, 2)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition flex items-center space-x-1 cursor-pointer ${
                            voterRank === 2
                              ? 'bg-slate-400 text-slate-950 shadow-sm ring-2 ring-slate-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span>🥈 2nd Choice (+2)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCastVote('ppsr', p.id, 3)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition flex items-center space-x-1 cursor-pointer ${
                            voterRank === 3
                              ? 'bg-amber-700 text-white shadow-sm ring-2 ring-amber-600'
                              : 'bg-slate-100 hover:bg-amber-50 text-slate-700'
                          }`}
                        >
                          <span>🥉 3rd Choice (+1)</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADD MEMBER MODAL */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold font-mono uppercase text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Add CFT Committee Member</span>
              </h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Member Name *</label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g., Ramesh Deshmukh"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Designation / Role</label>
                <input
                  type="text"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  placeholder="e.g., Maintenance Head"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCftMember}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-mono"
              >
                Save Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL AWARD CERTIFICATE LIGHTBOX MODAL */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border-4 border-amber-400 relative space-y-6 my-8 text-slate-900">
            
            {/* Close button */}
            <button
              onClick={() => setShowCertificateModal(null)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition cursor-pointer print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Certificate Layout */}
            <div className="border-2 border-dashed border-amber-300 p-6 rounded-2xl text-center space-y-4 relative bg-amber-50/30">
              
              <div className="flex justify-center mb-2">
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-full flex items-center justify-center shadow-lg border-2 border-amber-300">
                  <Trophy className="w-8 h-8 text-slate-950" />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase font-mono tracking-widest text-amber-700 block">
                  SHOPFLOOR CONTINUOUS IMPROVEMENT EXCELLENCE
                </span>
                <h1 className="text-2xl font-black font-display text-slate-950 uppercase tracking-tight mt-1">
                  OFFICIAL CERTIFICATE OF AWARD
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Monthly Cross-Functional Team (CFT) Decision • {selectedMonth}
                </p>
              </div>

              <div className="py-3 border-y border-amber-200 space-y-2">
                <p className="text-xs text-slate-600 italic">
                  This honor is proudly presented to:
                </p>
                <div className="text-xl font-extrabold text-slate-900 font-mono tracking-wide underline decoration-amber-400 decoration-2">
                  {showCertificateModal.winnerName}
                </div>
                <p className="text-xs text-slate-600">
                  For outstanding performance and shopfloor innovation on project:
                </p>
                <div className="text-sm font-bold text-slate-800 font-sans max-w-lg mx-auto bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                  [{showCertificateModal.srNo}] {showCertificateModal.title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono text-left bg-white p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Award Position:</span>
                  <span className="font-bold text-amber-700">
                    {showCertificateModal.rank === 1 ? '🥇 1st Prize (Gold Award)' : showCertificateModal.rank === 2 ? '🥈 2nd Prize (Silver Award)' : '🥉 3rd Prize (Bronze Award)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Plant / Location:</span>
                  <span className="font-bold text-slate-800">{showCertificateModal.area}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Module Type:</span>
                  <span className="font-bold text-indigo-700">{showCertificateModal.type} Module</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Verified Savings Impact:</span>
                  <span className="font-bold text-emerald-700">{showCertificateModal.costSaveText}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-center text-xs font-mono">
                <div>
                  <div className="border-b border-slate-400 pb-1 font-bold text-slate-800">
                    {chairperson}
                  </div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block mt-1">
                    CFT Committee Lead
                  </span>
                </div>
                <div>
                  <div className="border-b border-slate-400 pb-1 font-bold text-slate-800">
                    Rajesh Patil (Steering Head)
                  </div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block mt-1">
                    Plant Steering Committee
                  </span>
                </div>
              </div>

            </div>

            {/* Print button */}
            <div className="flex justify-end space-x-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-mono transition flex items-center space-x-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print Award Certificate</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
