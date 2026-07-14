import { useMemo, useState } from 'react';
import { agents } from './agents';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import AuthGate from './auth/AuthGate';
import ActividadView from './components/ActividadView';
import AgentesView from './components/AgentesView';
import ChatPanel from './components/ChatPanel';
import MemoriaView from './components/MemoriaView';
import PanelView from './components/PanelView';
import PlaceholderView from './components/PlaceholderView';
import Sidebar, { type ViewId } from './components/Sidebar';
import TopBar, { type CameraMode } from './components/TopBar';
import { useAgentChat } from './hooks/useAgentChat';
import { useContactMemoryFeed } from './hooks/useContactMemoryFeed';
import { useOfficeActivityFeed } from './hooks/useOfficeActivityFeed';
import OfficeCanvas from './three/OfficeCanvas';

const VIEW_TITLES: Record<ViewId, string> = {
  panel: 'Panel',
  agentes: 'Agentes',
  oficina: 'Oficina',
  actividad: 'Actividad',
  memoria: 'Memoria',
  archivos: 'Archivos',
  rutinas: 'Rutinas',
  buscar: 'Buscar',
  analiticas: 'Analíticas',
  informes: 'Informes',
  skills: 'Skills',
};

function OfficeApp() {
  const { user, signOut } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewId>('oficina');
  const [cameraMode, setCameraMode] = useState<CameraMode>('iso');
  const { messagesByAgent, sendMessage, decideApproval, typingAgentId, pendingApproval } = useAgentChat();
  const { snapshots: activitySnapshots, recentEvents, state: activityState } = useOfficeActivityFeed();
  const { state: memoryState, forgetItem } = useContactMemoryFeed();

  // Visual posture comes from real (simulated, for now) operational events —
  // never from chat "typing" state. See COORDINACION_CLAUDE_CODEX.md.
  const officeAgents = useMemo(
    () =>
      agents.map((agent) => ({
        ...agent,
        status: activitySnapshots[agent.id]?.status ?? agent.status,
      })),
    [activitySnapshots],
  );

  const selectedAgent = useMemo(() => officeAgents.find((a) => a.id === selectedId) ?? null, [officeAgents, selectedId]);

  const selectAgent = (id: string) => {
    setActiveView('oficina');
    setSelectedId(id);
  };

  // ChatPanel renders off selectedId regardless of activeView, so opening a
  // conversation from AgentesView doesn't need to leave that view.
  const openChat = (id: string) => setSelectedId(id);

  const startNewTask = (text: string) => {
    const leadIntake = agents.find((a) => a.id === 'lead-intake');
    if (!leadIntake) return;
    setActiveView('oficina');
    setSelectedId(leadIntake.id);
    void sendMessage(leadIntake, text);
  };

  return (
    <div className="onyx-app h-screen w-full text-slate-100 flex overflow-hidden">
      <Sidebar active={activeView} onSelect={setActiveView} userEmail={user?.email ?? null} onSignOut={signOut} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          agents={officeAgents}
          onSelectAgent={selectAgent}
          pendingApproval={pendingApproval}
          onNewTask={startNewTask}
          cameraMode={cameraMode}
          onCameraModeChange={setCameraMode}
        />

        <main className="flex-1 relative">
          {activeView === 'oficina' ? (
            <OfficeCanvas
              agents={officeAgents}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onHover={() => {}}
              cameraMode={cameraMode}
            />
          ) : activeView === 'actividad' ? (
            <ActividadView events={recentEvents} agents={officeAgents} onSelectAgent={selectAgent} />
          ) : activeView === 'panel' ? (
            <PanelView state={activityState} agents={officeAgents} onSelectAgent={selectAgent} />
          ) : activeView === 'agentes' ? (
            <AgentesView agents={officeAgents} snapshots={activitySnapshots} onOpenOffice={selectAgent} onOpenChat={openChat} />
          ) : activeView === 'memoria' ? (
            <MemoriaView state={memoryState} onForgetItem={forgetItem} />
          ) : (
            <PlaceholderView title={VIEW_TITLES[activeView]} />
          )}
        </main>
      </div>

      <ChatPanel
        agent={selectedAgent}
        messages={selectedAgent ? messagesByAgent[selectedAgent.id] ?? [] : []}
        isTyping={typingAgentId === selectedAgent?.id}
        onClose={() => setSelectedId(null)}
        onSend={(text) => selectedAgent && sendMessage(selectedAgent, text)}
        onDecideApproval={(approved) => selectedAgent && decideApproval(selectedAgent, approved)}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <OfficeApp />
      </AuthGate>
    </AuthProvider>
  );
}

export default App;
