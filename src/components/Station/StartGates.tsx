import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { spaceManager } from '../../core/state/SpaceManager';
import { importFilesToStation } from '../../core/import/ImportService';
import { EntitlementLimitError, entitlementsService } from '../../core/access/EntitlementsService';

const showActionError = (error: unknown) => {
    if (error instanceof EntitlementLimitError) {
        window.alert(error.message);
        return;
    }
    window.alert('Action is unavailable right now. Please retry.');
};

const getActiveUserSpaceCount = (): number => (
    spaceManager
        .getSpacesWithOptions({ includePlayground: false })
        .filter(space => (space.kind ?? 'user') === 'user')
        .length
);

const StartGates = () => {
    const setViewContext = useAppStore(state => state.setViewContext);
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [isImporting, setIsImporting] = React.useState(false);
    const gateClassName = 'ui-selectable group inline-flex items-center gap-3 h-12 px-6 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-bg-surface)]/40 backdrop-blur-xl border border-[var(--semantic-color-border-default)]/60 transition-all shadow-lg shadow-black/10 hover:bg-[var(--semantic-color-bg-surface)]/80 hover:border-[var(--semantic-color-text-primary)]/30';
    const iconClassName = 'w-5 h-5 flex items-center justify-center text-[var(--semantic-color-text-secondary)] group-hover:text-[var(--semantic-color-text-primary)] transition-colors';
    const labelClassName = 'text-[var(--semantic-color-text-secondary)] text-sm font-medium group-hover:text-[var(--semantic-color-text-primary)] transition-colors';

    const handleCreateSpace = React.useCallback(async () => {
        try {
            await entitlementsService.ensureCanCreateSpace(getActiveUserSpaceCount());
            const id = spaceManager.createSpace();
            await spaceManager.loadSpace(id);
        } catch (error) {
            showActionError(error);
        }
    }, []);

    const handleOpenPortalBuilder = React.useCallback(async () => {
        try {
            await entitlementsService.ensureCanUsePortalBuilder();
            setGatewayRoute({ type: 'portal-builder', slug: 'symbolfield' });
            setViewContext('gateway');
        } catch (error) {
            showActionError(error);
        }
    }, [setGatewayRoute, setViewContext]);

    const handleImportSelection = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const list = event.target.files;
        if (!list || list.length === 0) return;

        const files = Array.from(list);
        setIsImporting(true);
        try {
            await entitlementsService.ensureCanImport();
            const result = await importFilesToStation(files);
            await spaceManager.loadSpace(result.spaceId);
            setViewContext('space');
        } catch (error) {
            showActionError(error);
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    }, [setViewContext]);

    return (
        <div className="flex flex-wrap items-center justify-center gap-3">
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept=".md,.markdown,.txt,.canvas,.pdf"
                onChange={handleImportSelection}
            />
            <button
                onClick={() => { void handleCreateSpace(); }}
                className={gateClassName}
            >
                <span className={iconClassName}>+</span>
                <span className={labelClassName}>New Space</span>
            </button>

            <button
                onClick={() => { void handleOpenPortalBuilder(); }}
                className={gateClassName}
            >
                <span className={iconClassName}>◎</span>
                <span className={labelClassName}>New Portal</span>
            </button>

            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className={gateClassName}
            >
                <span className={iconClassName}>↓</span>
                <span className={labelClassName}>{isImporting ? 'Importing...' : 'Import'}</span>
            </button>

            <button
                onClick={() => {
                    setGatewayRoute({ type: 'atlas' });
                    setViewContext('gateway');
                }}
                className={gateClassName}
            >
                <span className={iconClassName}>↗</span>
                <span className={labelClassName}>Explore</span>
            </button>

            <button
                onClick={() => { void handleOpenPortalBuilder(); }}
                className={gateClassName}
            >
                <span className={iconClassName}>◈</span>
                <span className={labelClassName}>Portal Builder</span>
            </button>
        </div>
    );
};

export default StartGates;
