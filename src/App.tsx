import { useMemo, useState } from 'react';
import { agents } from './agents';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import AuthGate from './auth/AuthGate';
import ActivacionView from './components/ActivacionView';
import ActividadView from './components/ActividadView';
import AgentesView from './components/AgentesView';
import AnalisisView from './components/AnalisisView';
import BandejaView from './components/BandejaView';
import ChatPanel from './components/ChatPanel';
import Contact360Panel from './components/Contact360Panel';
import ConfiguradorView from './components/ConfiguradorView';
import ContactosView from './components/ContactosView';
import MemoriaView from './components/MemoriaView';
import PanelView from './components/PanelView';
import PlaceholderView from './components/PlaceholderView';
import RutinasView from './components/RutinasView';
import Sidebar, { type ViewId } from './components/Sidebar';
import TareasView from './components/TareasView';
import TopBar, { type CameraMode } from './components/TopBar';
import { useAgentChat } from './hooks/useAgentChat';
import { useAnalyticsFeed } from './hooks/useAnalyticsFeed';
import { resolveContactIdFromEvent, useContact360Feed } from './hooks/useContact360Feed';
import { useContactMemoryFeed } from './hooks/useContactMemoryFeed';
import { useInboxFeed } from './hooks/useInboxFeed';
import { useOfficeActivation } from './hooks/useOfficeActivation';
import { useOfficeActivityFeed } from './hooks/useOfficeActivityFeed';
import { useOfficeConfigurator } from './hooks/useOfficeConfigurator';
import { useRoutineFeed } from './hooks/useRoutineFeed';
import { useTaskFeed } from './hooks/useTaskFeed';
import OfficeCanvas from './three/OfficeCanvas';

// Demo-only workspace id for the template configurator — this module has no
// real workspace selector yet ("todavía sin conexiones reales").
const DEMO_CONFIGURATOR_WORKSPACE_ID = 'workspace-demo';

const VIEW_TITLES: Record<ViewId, string> = {
  panel: 'Panel',
  agentes: 'Agentes',
  contactos: 'Contactos',
  bandeja: 'Bandeja',
  tareas: 'Tareas',
  oficina: 'Oficina',
  actividad: 'Actividad',
  memoria: 'Memoria',
  archivos: 'Archivos',
  rutinas: 'Rutinas',
  buscar: 'Buscar',
  analiticas: 'Analíticas',
  informes: 'Informes',
  skills: 'Skills',
  activacion: 'Activación',
  configurador: 'Configurador',
};

function OfficeApp() {
  const { user, signOut } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewId>('oficina');
  const [cameraMode, setCameraMode] = useState<CameraMode>('iso');
  const { messagesByAgent, sendMessage, decideApproval, typingAgentId, pendingApproval } = useAgentChat();
  const { snapshots: activitySnapshots, recentEvents, state: activityState } = useOfficeActivityFeed();
  const { state: memoryState, forgetItem } = useContactMemoryFeed();
  const { contacts: contact360List, getContact } = useContact360Feed();
  const [contact360Id, setContact360Id] = useState<string | null>(null);
  const inboxFeed = useInboxFeed();
  const taskFeed = useTaskFeed();
  const routineFeed = useRoutineFeed();
  const analyticsFeed = useAnalyticsFeed({
    workspaceId: DEMO_CONFIGURATOR_WORKSPACE_ID,
    events: recentEvents,
    taskState: taskFeed.state,
    routineState: routineFeed.state,
  });
  // Demo-only stand-in for Codex's real ONYXLINK-superadmin role check —
  // see the note on Sidebar's isSuperAdmin prop. Drives both nav visibility
  // and the actor role sent to decideVirtualOfficeActivation, so there's a
  // single mock viewer concept instead of two divergent ones.
  const [isSuperAdmin, setIsSuperAdmin] = useState(true);
  const officeActivation = useOfficeActivation(
    user?.email ?? 'desconocido',
    isSuperAdmin ? 'onyxlink_super_admin' : 'workspace_admin',
  );
  const whatsappAgentName = agents.find((a) => a.id === 'lead-intake')?.name ?? 'Agente WhatsApp';
  const officeConfigurator = useOfficeConfigurator(
    DEMO_CONFIGURATOR_WORKSPACE_ID,
    user?.email ?? 'desconocido',
    isSuperAdmin ? 'onyxlink_super_admin' : 'workspace_admin',
  );

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
      <Sidebar
        active={activeView}
        onSelect={setActiveView}
        userEmail={user?.email ?? null}
        onSignOut={signOut}
        isSuperAdmin={isSuperAdmin}
        onToggleSuperAdmin={() =>
          setIsSuperAdmin((prev) => {
            const next = !prev;
            if (!next && (activeView === 'activacion' || activeView === 'configurador')) setActiveView('oficina');
            return next;
          })
        }
      />

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
            <ActividadView
              events={recentEvents}
              agents={officeAgents}
              onSelectAgent={selectAgent}
              resolveContactId={resolveContactIdFromEvent}
              onOpenContact={setContact360Id}
            />
          ) : activeView === 'panel' ? (
            <PanelView state={activityState} agents={officeAgents} onSelectAgent={selectAgent} />
          ) : activeView === 'agentes' ? (
            <AgentesView
              agents={officeAgents}
              snapshots={activitySnapshots}
              onOpenOffice={selectAgent}
              onOpenChat={openChat}
              resolveContactId={resolveContactIdFromEvent}
              onOpenContact={setContact360Id}
            />
          ) : activeView === 'contactos' ? (
            <ContactosView contacts={contact360List} onOpenContact={setContact360Id} />
          ) : activeView === 'bandeja' ? (
            <BandejaView feed={inboxFeed} agents={officeAgents} onOpenContact360={setContact360Id} />
          ) : activeView === 'tareas' ? (
            <TareasView feed={taskFeed} agents={officeAgents} contacts={contact360List} onOpenContact360={setContact360Id} />
          ) : activeView === 'rutinas' ? (
            <RutinasView feed={routineFeed} agents={officeAgents} />
          ) : activeView === 'analiticas' ? (
            <AnalisisView
              analytics={analyticsFeed.analytics}
              error={analyticsFeed.error}
              period={analyticsFeed.period}
              onPeriodChange={analyticsFeed.setPeriod}
              agents={officeAgents}
            />
          ) : activeView === 'memoria' ? (
            <MemoriaView state={memoryState} onForgetItem={forgetItem} />
          ) : activeView === 'activacion' && isSuperAdmin ? (
            <ActivacionView
              snapshot={officeActivation.snapshot}
              readiness={officeActivation.readiness}
              whatsappBinding={officeActivation.whatsappBinding}
              scenario={officeActivation.scenario}
              onScenarioChange={officeActivation.setScenario}
              lastDecision={officeActivation.lastDecision}
              onActivate={officeActivation.activate}
              onDeactivate={officeActivation.deactivate}
              whatsappAgentName={whatsappAgentName}
            />
          ) : activeView === 'configurador' && isSuperAdmin ? (
            <ConfiguradorView {...officeConfigurator} />
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

      <Contact360Panel contact={contact360Id ? getContact(contact360Id) : null} onClose={() => setContact360Id(null)} />
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
