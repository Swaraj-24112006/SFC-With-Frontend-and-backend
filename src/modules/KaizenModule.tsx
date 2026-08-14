import React from 'react';
import Dashboard from '../components/Dashboard';
import KaizenSheetForm from '../components/KaizenSheetForm';
import KaizenReviewBoard from '../components/KaizenReviewBoard';
import KaizenSpreadsheet from '../components/KaizenSpreadsheet';
import CftMonthlyAwards from '../components/CftMonthlyAwards';
import OpenImpactTracker from '../components/OpenImpactTracker';
import KaizenProcessFlowchart from '../components/KaizenProcessFlowchart';
import { Kaizen, PpsrReport, OpenImpactAction, UserPersona } from '../types';

interface KaizenModuleProps {
  activeTab: 'dashboard' | 'form' | 'committee' | 'list' | 'cft-awards' | 'impact-tracker' | 'process-flowchart';
  setActiveTab: (tab: 'dashboard' | 'form' | 'committee' | 'list' | 'cft-awards' | 'impact-tracker' | 'process-flowchart') => void;
  kaizens: Kaizen[];
  ppsrReports: PpsrReport[];
  impactActions: OpenImpactAction[];
  onAddKaizen: (kaizen: Partial<Kaizen>) => void;
  onUpdateKaizen: (id: string, updatedFields: Partial<Kaizen>) => void;
  onAddImpactAction: (action: Partial<OpenImpactAction>) => void;
  onUpdateImpactAction: (id: string, updates: Partial<OpenImpactAction>) => void;
  onDeleteImpactAction: (id: string) => void;
  onUpdatePpsrReport: (id: string, updatedFields: Partial<PpsrReport>) => void;
  onSelectKaizen: (kaizen: Kaizen) => void;
  handleSetPersona: (persona: UserPersona) => void;
}

export default function KaizenModule({
  activeTab,
  setActiveTab,
  kaizens,
  ppsrReports,
  impactActions,
  onAddKaizen,
  onUpdateKaizen,
  onAddImpactAction,
  onUpdateImpactAction,
  onDeleteImpactAction,
  onUpdatePpsrReport,
  onSelectKaizen,
  handleSetPersona
}: KaizenModuleProps) {
  return (
    <div className="space-y-1">
      {activeTab === 'dashboard' && (
        <Dashboard
          kaizens={kaizens}
          onSelectKaizen={onSelectKaizen}
          onNavigateToTab={(tab) => {
            if (tab === 'form') handleSetPersona('operator');
            else if (tab === 'committee') handleSetPersona('committee');
            else setActiveTab(tab as any);
          }}
        />
      )}

      {activeTab === 'list' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide font-mono mb-1">
              📋 Kaizen Spreadsheet Register
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Click on any entry row to inspect, print, or review its complete Kaizen sheet.
            </p>
          </div>
          <KaizenSpreadsheet
            kaizens={kaizens}
            onSelectKaizen={onSelectKaizen}
            onUpdateKaizen={onUpdateKaizen}
          />
        </div>
      )}

      {activeTab === 'form' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <KaizenSheetForm
            onAddKaizen={onAddKaizen}
            onCancel={() => setActiveTab('dashboard')}
          />
        </div>
      )}

      {activeTab === 'committee' && (
        <KaizenReviewBoard
          kaizens={kaizens}
          onUpdateKaizen={onUpdateKaizen}
        />
      )}

      {activeTab === 'cft-awards' && (
        <CftMonthlyAwards
          kaizens={kaizens}
          ppsrReports={ppsrReports}
          onUpdateKaizen={onUpdateKaizen}
          onUpdatePpsrReport={onUpdatePpsrReport}
        />
      )}

      {activeTab === 'impact-tracker' && (
        <OpenImpactTracker
          impactActions={impactActions}
          kaizens={kaizens}
          onAddImpactAction={onAddImpactAction}
          onUpdateImpactAction={onUpdateImpactAction}
          onDeleteImpactAction={onDeleteImpactAction}
        />
      )}

      {activeTab === 'process-flowchart' && (
        <KaizenProcessFlowchart />
      )}
    </div>
  );
}
