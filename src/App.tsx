import { useMemo, useState } from 'react';
import { agents } from './agents';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import ActivacionView from './components/ActivacionView';
import ActividadView from './components/ActividadView';
import AgentesView from './components/AgentesView';
import AnalisisView from './components/AnalisisView';
import ArchivosView from './components/ArchivosView';
import BandejaView from './components/BandejaView';
import BuscarView from './components/BuscarView';
import ChatPanel from './components/ChatPanel';
import Contact360Panel from './components/Contact360Panel';
import ConfiguradorView from './components/ConfiguradorView';
import ContactosView from './components/ContactosView';
import InformesView from './components/InformesView';
import MemoriaView from './components/MemoriaView';
import OrquestadorView from './components/OrquestadorView';
import PanelView from './components/PanelView';
import PlaceholderView from './components/PlaceholderView';
import RutinasView from './components/RutinasView';
import SkillsView from './components/SkillsView';
import Sidebar, { type ViewId } from './components/Sidebar';
import TareasView from './components/TareasView';
import TopBar, { type CameraMode } from './components/TopBar';
import { useAgentChat } from './hooks/useAgentChat';
import { useAnalyticsFeed } from './hooks/useAnalyticsFeed';
import { useGlobalSearch } from './hooks/useGlobalSearch';
import { resolveContactIdFromEvent, useContact360Feed } from './hooks/useContact360Feed';
import { useContactMemoryFeed } from './hooks/useContactMemoryFeed';
import { useFilesFeed } from './hooks/useFilesFeed';
import { useInboxFeed } from './hooks/useInboxFeed';
import { useOfficeActivation } from './hooks/useOfficeActivation';
import { useOfficeActivityFeed } from './hooks/useOfficeActivityFeed';
import { useOfficeConfigurator } from './hooks/useOfficeConfigurator';
import { useOpenRouterConnectionFeed } from './hooks/useOpenRouterConnectionFeed';
import { useOrchestratorFeed } from './hooks/useOrchestratorFeed';
import { useRoutineFeed } from './hooks/useRoutineFeed';
import { useReportsFeed } from './hooks/useReportsFeed';
import { useSkillsFeed } from './hooks/useSkillsFeed';
import { useTaskFeed } from './hooks/useTaskFeed';
import OfficeCanvas from './three/OfficeCanvas';
import type { GlobalSearchResult, GlobalSearchSources, GlobalSearchView } from './central-search';

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
  orquestador: 'Orquestador',
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
  const skillsFeed = useSkillsFeed(taskFeed.state, DEMO_CONFIGURATOR_WORKSPACE_ID);
  const filesFeed = useFilesFeed();
  const searchSources = useMemo<GlobalSearchSources>(() => ({
    contacts: contact360List,
    conversations: inboxFeed.threads,
    tasks: Object.values(taskFeed.state.tasks),
    routines: Object.values(routineFeed.state.routines),
    memories: Object.values(memoryState.profiles),
    activities: recentEvents,
  }), [contact360List, inboxFeed.threads, memoryState.profiles, recentEvents, routineFeed.state.routines, taskFeed.state.tasks]);
  const globalSearch = useGlobalSearch(DEMO_CONFIGURATOR_WORKSPACE_ID, searchSources);
  const [searchOpenTarget, setSearchOpenTarget] = useState<{
    view: GlobalSearchView;
    entityId: string;
    requestId: number;
  } | null>(null);
  const analyticsFeed = useAnalyticsFeed({
    workspaceId: DEMO_CONFIGURATOR_WORKSPACE_ID,
    events: recentEvents,
    taskState: taskFeed.state,
    routineState: routineFeed.state,
  });
  const reportsFeed = useReportsFeed(DEMO_CONFIGURATOR_WORKSPACE_ID, analyticsFeed.analytics);
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
  const orchestratorFeed = useOrchestratorFeed(
    user?.email ?? 'desconocido',
    isSuperAdmin ? 'super_admin' : 'workspace_admin',
    DEMO_CONFIGURATOR_WORKSPACE_ID,
  );
  const openRouterConnectionFeed = useOpenRouterConnectionFeed(
    user?.email ?? 'desconocido',
    isSuperAdmin ? 'super_admin' : 'workspace_admin',
    DEMO_CONFIGURATOR_WORKSPACE_ID,
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

  const openSearchResult = (result: GlobalSearchResult) => {
    if (result.target.view === 'bandeja') inboxFeed.resetFilters();
    if (result.target.view === 'tareas') taskFeed.resetFilters();
    if (result.target.view === 'rutinas') routineFeed.resetFilters();
    setSearchOpenTarget((previous) => ({
      view: result.target.view,
      entityId: result.target.entityId,
      requestId: (previous?.requestId ?? 0) + 1,
    }));
    setActiveView(result.target.view);
    if (result.category === 'contact' && result.target.contactId) setContact360Id(result.target.contactId);
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
            if (!next && (activeView === 'activacion' || activeView === 'configurador' || activeView === 'orquestador')) setActiveView('oficina');
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
          viewTitle={VIEW_TITLES[activeView]}
          isOfficeView={activeView === 'oficina'}
          onOpenSearch={() => setActiveView('buscar')}
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
              highlightedEventId={searchOpenTarget?.view === 'actividad' ? searchOpenTarget.entityId : null}
              openRequestId={searchOpenTarget?.requestId}
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
            <BandejaView
              feed={inboxFeed}
              agents={officeAgents}
              onOpenContact360={setContact360Id}
              openContactId={searchOpenTarget?.view === 'bandeja' ? searchOpenTarget.entityId : null}
              openRequestId={searchOpenTarget?.requestId}
            />
          ) : activeView === 'tareas' ? (
            <TareasView
              feed={taskFeed}
              agents={officeAgents}
              contacts={contact360List}
              onOpenContact360={setContact360Id}
              openTaskId={searchOpenTarget?.view === 'tareas' ? searchOpenTarget.entityId : null}
              openRequestId={searchOpenTarget?.requestId}
            />
          ) : activeView === 'rutinas' ? (
            <RutinasView
              feed={routineFeed}
              agents={officeAgents}
              openRoutineId={searchOpenTarget?.view === 'rutinas' ? searchOpenTarget.entityId : null}
              openRequestId={searchOpenTarget?.requestId}
            />
          ) : activeView === 'archivos' ? (
            <ArchivosView feed={filesFeed} agents={officeAgents} />
          ) : activeView === 'skills' ? (
            <SkillsView feed={skillsFeed} />
          ) : activeView === 'buscar' ? (
            <BuscarView feed={globalSearch} onOpenResult={openSearchResult} />
          ) : activeView === 'analiticas' ? (
            <AnalisisView
              analytics={analyticsFeed.analytics}
              error={analyticsFeed.error}
              period={analyticsFeed.period}
              onPeriodChange={analyticsFeed.setPeriod}
              agents={officeAgents}
            />
          ) : activeView === 'informes' ? (
            <InformesView feed={reportsFeed} agents={officeAgents} />
          ) : activeView === 'memoria' ? (
            <MemoriaView
              state={memoryState}
              onForgetItem={forgetItem}
              openContactId={searchOpenTarget?.view === 'memoria' ? searchOpenTarget.entityId : null}
              openRequestId={searchOpenTarget?.requestId}
            />
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
          ) : activeView === 'orquestador' && isSuperAdmin ? (
            <OrquestadorView feed={orchestratorFeed} agents={officeAgents} connectionFeed={openRouterConnectionFeed} />
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
      <OfficeApp />
    </AuthProvider>
  );
}

export default App;
