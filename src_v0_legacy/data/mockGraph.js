export const mockNodes = [
    { id: 'core', glyph: '⊙', title: 'Core', x: 0, y: 0, type: 'core' },
    { id: 'hud', glyph: '⊞', title: 'HUD', x: 200, y: -100, type: 'module' },
    { id: 'graph', glyph: '∴', title: 'Graph', x: 200, y: 100, type: 'module' },
    { id: 'agent', glyph: '𓂀', title: 'Agent', x: -200, y: 0, type: 'module' },
    { id: 'skill1', glyph: '○', title: 'Perception', x: 400, y: -150, type: 'skill' },
    { id: 'skill2', glyph: '○', title: 'Analysis', x: 400, y: -50, type: 'skill' },
];

export const mockEdges = [
    { source: 'core', target: 'hud' },
    { source: 'core', target: 'graph' },
    { source: 'core', target: 'agent' },
    { source: 'hud', target: 'skill1' },
    { source: 'hud', target: 'skill2' },
];
