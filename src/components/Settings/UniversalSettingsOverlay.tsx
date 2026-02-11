import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';
import { resetAccount, resetSettings } from '../../core/state/onboardingState';
import AppearanceSettingsPanel from './AppearanceSettingsPanel';
import { CapsuleTabs, TogglePill } from '../Common';

interface UniversalSettingsOverlayProps {
    onClose: () => void;
}

type ScopeSectionId = 'station' | 'space' | 'node';
type SectionId = ScopeSectionId | 'experimental' | 'account' | 'data';

const SCOPE_SECTIONS: Array<{ id: ScopeSectionId; label: string }> = [
    { id: 'station', label: 'Station' },
    { id: 'space', label: 'Space' },
    { id: 'node', label: 'Node' }
];

const NAV_ITEMS: Array<{ id: Exclude<SectionId, ScopeSectionId>; label: string; context?: string[] }> = [
    { id: 'experimental', label: 'Experimental UI Sandbox' },
    { id: 'account', label: 'Account' },
    { id: 'data', label: 'Data', context: ['home'] }
];

const isScopeSection = (value: SectionId): value is ScopeSectionId =>
    value === 'station' || value === 'space' || value === 'node';

const getDefaultSection = (viewContext: string): ScopeSectionId => {
    if (viewContext === 'home') return 'station';
    if (viewContext === 'node') return 'node';
    return 'space';
};

const UniversalSettingsOverlay = ({ onClose }: UniversalSettingsOverlayProps) => {
    const viewContext = useAppStore(state => state.viewContext);

    // Global/Station Settings
    const showStationLabels = useAppStore(state => state.showStationLabels);
    const setShowStationLabels = useAppStore(state => state.setShowStationLabels);
    const showPlaygroundOnStation = useAppStore(state => state.showPlaygroundOnStation);
    const setShowPlaygroundOnStation = useAppStore(state => state.setShowPlaygroundOnStation);
    const pathDisplayMode = useAppStore(state => state.pathDisplayMode);
    const setPathDisplayMode = useAppStore(state => state.setPathDisplayMode);
    const breadcrumbLens = useAppStore(state => state.breadcrumbLens);
    const setBreadcrumbLens = useAppStore(state => state.setBreadcrumbLens);
    const navigationFlowMode = useAppStore(state => state.navigationFlowMode);
    const setNavigationFlowMode = useAppStore(state => state.setNavigationFlowMode);

    // Space/View Settings
    const showGrid = useAppStore(state => state.showGrid);
    const setShowGrid = useAppStore(state => state.setShowGrid);
    const showEdges = useAppStore(state => state.showEdges);
    const setShowEdges = useAppStore(state => state.setShowEdges);
    const showHud = useAppStore(state => state.showHud);
    const setShowHud = useAppStore(state => state.setShowHud);
    const showCounters = useAppStore(state => state.showCounters);
    const setShowCounters = useAppStore(state => state.setShowCounters);
    const gridSnapEnabled = useAppStore(state => state.gridSnapEnabled);
    const setGridSnapEnabled = useAppStore(state => state.setGridSnapEnabled);
    const gridStepMul = useAppStore(state => state.gridStepMul);
    const setGridStepMul = useAppStore(state => state.setGridStepMul);
    const contextMenuMode = useAppStore(state => state.contextMenuMode);
    const setContextMenuMode = useAppStore(state => state.setContextMenuMode);

    // Node Context
    const activeScope = useAppStore(state => state.activeScope);
    const exitNode = useAppStore(state => state.exitNode);
    const nodes = useGraphStore(state => state.nodes);
    const updateNode = useGraphStore(state => state.updateNode);

    const defaultScopeSection = getDefaultSection(viewContext);
    const [section, setSection] = useState<SectionId>(defaultScopeSection);

    const availableNavItems = useMemo(
        () => NAV_ITEMS.filter(item => !item.context || item.context.includes(viewContext)),
        [viewContext]
    );

    const effectiveSection: SectionId = isScopeSection(section) || availableNavItems.find(item => item.id === section)
        ? section
        : defaultScopeSection;

    const activeScopeSection: ScopeSectionId = isScopeSection(effectiveSection)
        ? effectiveSection
        : defaultScopeSection;

    const cycleScopeSection = (direction: 1 | -1) => {
        setSection(prev => {
            const ids = SCOPE_SECTIONS.map(item => item.id);
            const current = isScopeSection(prev) ? prev : defaultScopeSection;
            const currentIndex = Math.max(0, ids.indexOf(current));
            const nextIndex = (currentIndex + direction + ids.length) % ids.length;
            return ids[nextIndex] ?? defaultScopeSection;
        });
    };

    const activeNode = useMemo(() => {
        if (viewContext !== 'node' || !activeScope) return null;
        return nodes.find(node => node.id === activeScope) ?? null;
    }, [viewContext, activeScope, nodes]);

    const saveNodeLabel = (nextValue: string) => {
        if (!activeNode) return;
        const current = typeof activeNode.data?.label === 'string' ? activeNode.data.label : '';
        const next = nextValue.trim() || 'Untitled Node';
        if (next === current) return;
        updateNode(activeNode.id, {
            data: {
                ...activeNode.data,
                label: next
            }
        });
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const scopeLabel = viewContext === 'home'
        ? 'Station Scope'
        : viewContext === 'node'
            ? 'Node Scope'
            : 'Space Scope';

    return (
        <div className="fixed inset-0 z-[var(--component-z-modal)] bg-black/20 backdrop-blur-md animate-fade-in flex items-center justify-center p-8" onClick={onClose}>
            <div
                className="w-full max-w-5xl h-[600px] glass-panel shadow-2xl overflow-hidden animate-scale-in flex"
                onClick={(event) => event.stopPropagation()}
            >
                <aside className="w-[var(--component-drawer-width-default)] border-r border-[var(--semantic-color-border-default)] glass-base bg-[var(--semantic-color-bg-surface)]/30 p-[var(--primitive-space-panel-padding)] flex flex-col gap-4 shrink-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-muted)] px-2">
                        Settings
                    </div>
                    <div className="flex items-center gap-3 px-3 py-3 rounded-[var(--primitive-radius-card)] bg-[var(--semantic-color-bg-app)]/50 border border-[var(--semantic-color-border-default)]">
                        <div className="w-10 h-10 rounded-full bg-[var(--semantic-color-bg-surface)] border border-[var(--semantic-color-border-default)] flex items-center justify-center text-lg">
                            ◉
                        </div>
                        <div>
                            <div className="text-[var(--semantic-color-text-primary)] text-sm font-medium">Local Builder</div>
                            <div className="text-[var(--semantic-color-text-secondary)] text-xs">{scopeLabel}</div>
                        </div>
                    </div>

                    <div className="mt-2 space-y-1">
                        <div className="px-2 py-2">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-muted)] mb-2">
                                Scope Layer
                            </div>
                            <CapsuleTabs
                                items={SCOPE_SECTIONS}
                                activeId={activeScopeSection}
                                onSelect={(id) => setSection(id as ScopeSectionId)}
                                onCycle={cycleScopeSection}
                                title="Station/Space/Node (click or Tab to switch)"
                                className="w-full justify-center"
                                size="sm"
                            />
                            <div className="text-[10px] text-[var(--semantic-color-text-muted)] mt-1 px-1">
                                Current: {scopeLabel}
                            </div>
                        </div>

                        {availableNavItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setSection(item.id)}
                                data-state={effectiveSection === item.id ? 'active' : 'inactive'}
                                className="ui-selectable w-full text-left px-4 py-2.5 rounded-[var(--primitive-radius-input)] text-sm transition-colors"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="flex-1 p-[var(--primitive-space-panel-padding)] overflow-y-auto bg-[var(--semantic-color-bg-app)]/20 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-bg-surface)] border border-transparent hover:border-[var(--semantic-color-border-default)] transition-all z-10"
                        aria-label="Close"
                    >
                        ✕
                    </button>

                    <div className="max-w-2xl mx-auto pt-4">
                        {effectiveSection === 'station' && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">Station</h2>
                                    <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">Station-level defaults and visibility.</p>
                                </div>
                                <div className="glass-panel p-6 space-y-4">
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Show Playground on Station</span>
                                        <TogglePill checked={showPlaygroundOnStation} onToggle={() => setShowPlaygroundOnStation(!showPlaygroundOnStation)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Station labels</span>
                                        <TogglePill checked={showStationLabels} onToggle={() => setShowStationLabels(!showStationLabels)} />
                                    </div>
                                    <div className="h-px bg-[var(--semantic-color-border-default)] my-2 opacity-50" />
                                    <div className="space-y-2">
                                        <div className="text-sm text-[var(--semantic-color-text-secondary)]">Path display</div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPathDisplayMode('full')}
                                                data-state={pathDisplayMode === 'full' ? 'active' : 'inactive'}
                                                className="ui-selectable ui-shape-pill ui-capsule-compact-item px-3 text-[11px] uppercase tracking-[0.14em]"
                                            >
                                                Full Breadcrumb
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPathDisplayMode('compact')}
                                                data-state={pathDisplayMode === 'compact' ? 'active' : 'inactive'}
                                                className="ui-selectable ui-shape-pill ui-capsule-compact-item px-3 text-[11px] uppercase tracking-[0.14em]"
                                            >
                                                Level Capsule
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-sm text-[var(--semantic-color-text-secondary)]">Path lens</div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setBreadcrumbLens('focus')}
                                                data-state={breadcrumbLens === 'focus' ? 'active' : 'inactive'}
                                                className="ui-selectable ui-shape-pill ui-capsule-compact-item px-3 text-[11px] uppercase tracking-[0.14em]"
                                            >
                                                Focus
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBreadcrumbLens('internal')}
                                                data-state={breadcrumbLens === 'internal' ? 'active' : 'inactive'}
                                                className="ui-selectable ui-shape-pill ui-capsule-compact-item px-3 text-[11px] uppercase tracking-[0.14em]"
                                            >
                                                Internal
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBreadcrumbLens('external')}
                                                data-state={breadcrumbLens === 'external' ? 'active' : 'inactive'}
                                                className="ui-selectable ui-shape-pill ui-capsule-compact-item px-3 text-[11px] uppercase tracking-[0.14em]"
                                            >
                                                External
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBreadcrumbLens('full')}
                                                data-state={breadcrumbLens === 'full' ? 'active' : 'inactive'}
                                                className="ui-selectable ui-shape-pill ui-capsule-compact-item px-3 text-[11px] uppercase tracking-[0.14em]"
                                            >
                                                Full Chain
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-sm text-[var(--semantic-color-text-secondary)]">Flow mode</div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setNavigationFlowMode('auto')}
                                                data-state={navigationFlowMode === 'auto' ? 'active' : 'inactive'}
                                                className="ui-selectable ui-shape-pill ui-capsule-compact-item px-3 text-[11px] uppercase tracking-[0.14em]"
                                            >
                                                Auto
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNavigationFlowMode('build')}
                                                data-state={navigationFlowMode === 'build' ? 'active' : 'inactive'}
                                                className="ui-selectable ui-shape-pill ui-capsule-compact-item px-3 text-[11px] uppercase tracking-[0.14em]"
                                            >
                                                Build
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNavigationFlowMode('explore')}
                                                data-state={navigationFlowMode === 'explore' ? 'active' : 'inactive'}
                                                className="ui-selectable ui-shape-pill ui-capsule-compact-item px-3 text-[11px] uppercase tracking-[0.14em]"
                                            >
                                                Explore
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {effectiveSection === 'space' && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">Space & View</h2>
                                    <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">Canvas interaction and visibility settings for current Space.</p>
                                </div>
                                <div className="glass-panel p-6 space-y-4">
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Show grid</span>
                                        <TogglePill checked={showGrid} onToggle={() => setShowGrid(!showGrid)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Link lines</span>
                                        <TogglePill checked={showEdges} onToggle={() => setShowEdges(!showEdges)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>HUD chips</span>
                                        <TogglePill checked={showHud} onToggle={() => setShowHud(!showHud)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>HUD counters</span>
                                        <TogglePill checked={showCounters} onToggle={() => setShowCounters(!showCounters)} />
                                    </div>

                                    <div className="h-px bg-[var(--semantic-color-border-default)] my-2 opacity-50" />

                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Grid snap</span>
                                        <TogglePill checked={gridSnapEnabled} onToggle={() => setGridSnapEnabled(!gridSnapEnabled)} />
                                    </div>

                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Grid step</span>
                                        <div className="flex items-center gap-1">
                                            {[0.5, 1, 2].map(step => (
                                                <button
                                                    key={step}
                                                    onClick={() => setGridStepMul(step)}
                                                    data-state={gridStepMul === step ? 'active' : 'inactive'}
                                                    className="ui-selectable px-2 py-1 rounded-[var(--primitive-radius-pill)] text-[10px]"
                                                >
                                                    {step}x
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Context menu mode</span>
                                        <div className="flex items-center gap-1 bg-[var(--semantic-color-text-primary)]/5 p-1 rounded-[var(--primitive-radius-pill)]">
                                            <button
                                                onClick={() => setContextMenuMode('bar')}
                                                data-state={contextMenuMode === 'bar' ? 'active' : 'inactive'}
                                                className="ui-selectable px-2 py-0.5 rounded-[var(--primitive-radius-pill)] text-[9px] uppercase tracking-wider"
                                            >
                                                Bar
                                            </button>
                                            <button
                                                onClick={() => setContextMenuMode('radial')}
                                                data-state={contextMenuMode === 'radial' ? 'active' : 'inactive'}
                                                className="ui-selectable px-2 py-0.5 rounded-[var(--primitive-radius-pill)] text-[9px] uppercase tracking-wider"
                                            >
                                                Radial
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {effectiveSection === 'node' && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">Node Context</h2>
                                    <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">Node-level settings and editor context behavior.</p>
                                </div>

                                {!activeNode && (
                                    <div className="glass-panel p-6 text-sm text-[var(--semantic-color-text-muted)]">
                                        No active node in context.
                                    </div>
                                )}

                                {activeNode && (
                                    <>
                                        <div className="glass-panel p-6 space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs uppercase tracking-wider text-[var(--semantic-color-text-muted)]">Node title</label>
                                                <input
                                                    type="text"
                                                    defaultValue={typeof activeNode.data?.label === 'string' ? activeNode.data.label : ''}
                                                    onBlur={(event) => saveNodeLabel(event.currentTarget.value)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter') {
                                                            (event.currentTarget as HTMLInputElement).blur();
                                                        }
                                                    }}
                                                    className="w-full bg-transparent border-b border-[var(--semantic-color-border-default)] text-[var(--semantic-color-text-primary)] text-lg focus:outline-none focus:border-[var(--semantic-color-action-primary)] py-1"
                                                />
                                            </div>

                                            <div className="text-xs text-[var(--semantic-color-text-muted)] break-all">
                                                Node ID: {activeNode.id}
                                            </div>

                                            <div className="text-xs text-[var(--semantic-color-text-muted)]">
                                                Content format: {typeof activeNode.data?.contentFormat === 'string' ? activeNode.data.contentFormat : 'legacy'}
                                            </div>
                                        </div>

                                        <div className="glass-panel p-6 space-y-4">
                                            <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                                <span>HUD chips in Node view</span>
                                                <TogglePill checked={showHud} onToggle={() => setShowHud(!showHud)} />
                                            </div>
                                            <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                                <span>HUD counters in Node view</span>
                                                <TogglePill checked={showCounters} onToggle={() => setShowCounters(!showCounters)} />
                                            </div>
                                            <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                                <span>Context menu mode</span>
                                                <div className="flex items-center gap-1 bg-[var(--semantic-color-text-primary)]/5 p-1 rounded-[var(--primitive-radius-pill)]">
                                                    <button
                                                        onClick={() => setContextMenuMode('bar')}
                                                        data-state={contextMenuMode === 'bar' ? 'active' : 'inactive'}
                                                        className="ui-selectable px-2 py-0.5 rounded-[var(--primitive-radius-pill)] text-[9px] uppercase tracking-wider"
                                                    >
                                                        Bar
                                                    </button>
                                                    <button
                                                        onClick={() => setContextMenuMode('radial')}
                                                        data-state={contextMenuMode === 'radial' ? 'active' : 'inactive'}
                                                        className="ui-selectable px-2 py-0.5 rounded-[var(--primitive-radius-pill)] text-[9px] uppercase tracking-wider"
                                                    >
                                                        Radial
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    exitNode();
                                                    onClose();
                                                }}
                                                className="ui-selectable w-full text-left px-4 py-2.5 rounded-[var(--primitive-radius-input)] text-sm"
                                            >
                                                Exit to Space
                                            </button>
                                        </div>
                                    </>
                                )}
                            </section>
                        )}

                        {effectiveSection === 'experimental' && (
                            <AppearanceSettingsPanel />
                        )}

                        {effectiveSection === 'account' && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">Account</h2>
                                    <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">Local account actions and reset controls.</p>
                                </div>
                                <div className="glass-panel p-6 space-y-3">
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Reset Settings: reset only UI and interaction preferences?')) {
                                                resetSettings();
                                            }
                                        }}
                                        className="w-full py-3 px-4 rounded-[var(--primitive-radius-input)] bg-[var(--semantic-color-bg-surface)] hover:bg-[var(--semantic-color-bg-surface)]/80 text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] border border-[var(--semantic-color-border-default)] text-sm font-medium transition-colors text-left"
                                    >
                                        Reset Settings Only
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Hard Reset: wipe all spaces and local data?')) {
                                                resetAccount();
                                            }
                                        }}
                                        className="w-full py-3 px-4 rounded-[var(--primitive-radius-input)] bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-sm font-medium transition-colors text-left"
                                    >
                                        Reset Account and Data
                                    </button>
                                </div>
                            </section>
                        )}

                        {effectiveSection === 'data' && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">Data</h2>
                                    <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">Import/export and backups.</p>
                                </div>
                                <div className="glass-panel p-6 text-sm text-[var(--semantic-color-text-muted)]">
                                    Data tools stay in this section. Advanced options are planned for v0.6.
                                </div>
                            </section>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default UniversalSettingsOverlay;
