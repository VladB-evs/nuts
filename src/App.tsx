import React from 'react';
import { IssueProvider, useIssues } from './context/TicketContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { IssueTable } from './components/IssueTable';
import { IssueDetail } from './components/IssueDetail';
import { CreateIssueModal } from './components/CreateIssueModal';
import { DepartmentModal } from './components/DepartmentModal';
import { ProfileModal } from './components/ProfileModal';
import { LoginScreen } from './components/LoginScreen';
import { DepartmentOnboardingModal } from './components/DepartmentOnboardingModal';

const AppContent: React.FC = () => {
  const {
    selectedIssue,
    currentUser,
    setCurrentUser,
    isDemoMode,
    enterDemoMode,
    exitDemoMode,
  } = useIssues();

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={(user) => setCurrentUser(user)}
        onEnterDemoMode={enterDemoMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
      {/* Demo Sandbox Alert Banner */}
      {isDemoMode && (
        <div className="bg-amber-500 text-white text-xs px-4 py-1.5 flex items-center justify-between font-medium shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-black/25 px-1.5 py-0.5 rounded">
              Sandbox Demo Mode
            </span>
            <span className="hidden sm:inline text-amber-50">
              You are previewing NUTS with test personas and sample data. Changes are not saved to your production database.
            </span>
          </div>
          <button
            onClick={exitDemoMode}
            className="px-2.5 py-1 bg-black/30 hover:bg-black/50 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Exit Demo & Sign In
          </button>
        </div>
      )}

      {/* Top Header */}
      <Header />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation */}
        <Sidebar />

        {/* Center Main Area: Either Detail view or Table list */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {selectedIssue ? <IssueDetail /> : <IssueTable />}
        </main>
      </div>

      {/* Modals */}
      <CreateIssueModal />
      <DepartmentModal />
      <ProfileModal />
      <DepartmentOnboardingModal />
    </div>
  );
};

export default function App() {
  return (
    <IssueProvider>
      <AppContent />
    </IssueProvider>
  );
}
