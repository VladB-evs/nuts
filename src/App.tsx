import React, { useState } from 'react';
import { IssueProvider, useIssues } from './context/TicketContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { IssueTable } from './components/IssueTable';
import { IssueDetail } from './components/IssueDetail';
import { CreateIssueModal } from './components/CreateIssueModal';
import { DepartmentModal } from './components/DepartmentModal';
import { ProfileModal } from './components/ProfileModal';
import { NeonModal } from './components/NeonModal';

const AppContent: React.FC = () => {
  const { selectedIssue } = useIssues();
  const [isNeonOpen, setIsNeonOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header onOpenNeon={() => setIsNeonOpen(true)} />

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
      <NeonModal isOpen={isNeonOpen} onClose={() => setIsNeonOpen(false)} />
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
