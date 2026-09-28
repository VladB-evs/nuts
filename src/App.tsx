import React, { useState } from 'react';
import { TicketProvider, useTickets } from './context/TicketContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DepartmentTabs } from './components/layout/DepartmentTabs';
import { MobileNav } from './components/layout/MobileNav';
import { FilterBar } from './components/filters/FilterBar';
import { KanbanView } from './components/views/KanbanView';
import { ListView } from './components/views/ListView';
import { MetricsView } from './components/views/MetricsView';
import { TicketDetailModal } from './components/tickets/TicketDetailModal';
import { CreateTicketModal } from './components/tickets/CreateTicketModal';
import { CommandPalette } from './components/filters/CommandPalette';
import { SupabaseGuideModal } from './components/views/SupabaseGuideModal';

const AppContent: React.FC = () => {
  const { activeView } = useTickets();
  const [isSupabaseGuideOpen, setIsSupabaseGuideOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Header */}
      <Header onOpenSupabaseGuide={() => setIsSupabaseGuideOpen(true)} />

      {/* Horizontal Department Switcher Tabs */}
      <DepartmentTabs />

      {/* Main Body: Sidebar + Dynamic View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar onOpenSupabaseGuide={() => setIsSupabaseGuideOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 overflow-hidden bg-zinc-950/30">
          {/* Filter Bar (Search, Status, Priority, Assignee, View Toggles) */}
          <FilterBar />

          {/* View Container */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeView === 'kanban' && <KanbanView />}
            {activeView === 'list' && <ListView />}
            {activeView === 'metrics' && <MetricsView />}
          </div>
        </main>
      </div>

      {/* Mobile Navigation bar and slide drawer */}
      <MobileNav onOpenSupabaseGuide={() => setIsSupabaseGuideOpen(true)} />

      {/* Modals & Dialogs */}
      <CreateTicketModal />
      <TicketDetailModal />
      <CommandPalette onOpenSupabaseGuide={() => setIsSupabaseGuideOpen(true)} />
      <SupabaseGuideModal
        isOpen={isSupabaseGuideOpen}
        onClose={() => setIsSupabaseGuideOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <TicketProvider>
      <AppContent />
    </TicketProvider>
  );
}
