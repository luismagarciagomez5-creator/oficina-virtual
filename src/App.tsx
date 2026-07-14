import { useMemo, useState } from 'react';
import { agents } from './agents';
import ChatPanel from './components/ChatPanel';
import PlaceholderView from './components/PlaceholderView';
import Sidebar, { type ViewId } from './components/Sidebar';
import TopBar, { type CameraMode } from './components/TopBar';
import { useAgentChat } from './hooks/useAgentChat';
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

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewId>('oficina');
  const [cameraMode, setCameraMode] = useState<CameraMode>('iso');
  const { messagesByAgent, sendMessage, decideApproval, typingAgentId, pendingApproval } = useAgentChat();

  const selectedAgent = useMemo(() => agents.find((a) => a.id === selectedId) ?? null, [selectedId]);

  const selectAgent = (id: string) => {
    setActiveView('oficina');
    setSelectedId(id);
  };

  const startNewTask = (text: string) => {
    const leadIntake = agents.find((a) => a.id === 'lead-intake');
    if (!leadIntake) return;
    setActiveView('oficina');
    setSelectedId(leadIntake.id);
    void sendMessage(leadIntake, text);
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex overflow-hidden">
      <Sidebar active={activeView} onSelect={setActiveView} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          agents={agents}
          onSelectAgent={selectAgent}
          pendingApproval={pendingApproval}
          onNewTask={startNewTask}
          cameraMode={cameraMode}
          onCameraModeChange={setCameraMode}
        />

        <main className="flex-1 relative">
          {activeView === 'oficina' ? (
            <OfficeCanvas agents={agents} selectedId={selectedId} onSelect={setSelectedId} onHover={() => {}} />
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

export default App;
