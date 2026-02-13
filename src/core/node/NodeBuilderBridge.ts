export interface NodeBuilderRuntimeHandle {
    appendMarkdown: (markdown: string) => Promise<void>;
    focus: () => void;
}

class NodeBuilderBridge {
    private activeNodeId: string | null = null;
    private activeHandle: NodeBuilderRuntimeHandle | null = null;

    register(nodeId: string, handle: NodeBuilderRuntimeHandle) {
        this.activeNodeId = nodeId;
        this.activeHandle = handle;
    }

    unregister(nodeId?: string) {
        if (nodeId && this.activeNodeId !== nodeId) return;
        this.activeNodeId = null;
        this.activeHandle = null;
    }

    canHandle(nodeId: string): boolean {
        return Boolean(this.activeHandle && this.activeNodeId === nodeId);
    }

    async appendToNode(nodeId: string, markdown: string): Promise<boolean> {
        const handle = this.activeHandle;
        if (!handle || this.activeNodeId !== nodeId) return false;
        await handle.appendMarkdown(markdown);
        handle.focus();
        return true;
    }
}

export const nodeBuilderBridge = new NodeBuilderBridge();
