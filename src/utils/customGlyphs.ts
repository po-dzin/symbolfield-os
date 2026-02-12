import archecoreSvg from '../assets/glyphs/archecore.svg?raw';
import clusterSvg from '../assets/glyphs/cluster.svg?raw';
import coreSvg from '../assets/glyphs/core.svg?raw';
import glyphSvg from '../assets/glyphs/glyph.svg?raw';
import groupSvg from '../assets/glyphs/group.svg?raw';
import linkSvg from '../assets/glyphs/link.svg?raw';
import linkActionSvg from '../assets/glyphs/link-action.svg?raw';
import nodeSvg from '../assets/glyphs/node.svg?raw';
import pointerSvg from '../assets/glyphs/pointer.svg?raw';
import playgroundSvg from '../assets/glyphs/playground.svg?raw';
import portalSvg from '../assets/glyphs/portal.svg?raw';
import renameSvg from '../assets/glyphs/rename.svg?raw';
import deleteSvg from '../assets/glyphs/delete.svg?raw';
import foldSvg from '../assets/glyphs/fold.svg?raw';
import unfoldSvg from '../assets/glyphs/unfold.svg?raw';
import areaSvg from '../assets/glyphs/area.svg?raw';
import ungroupSvg from '../assets/glyphs/ungroup.svg?raw';

export type CustomGlyphCategory = {
    id: string;
    label: string;
    glyphs: string[];
};

export type CustomGlyph = {
    id: string;
    label: string;
    categories: string[];
    svg: string;
};

export const CUSTOM_GLYPHS: CustomGlyph[] = [
    { id: 'core', label: 'Core', categories: ['core'], svg: coreSvg },
    { id: 'archecore', label: 'ArcheCore', categories: ['core'], svg: archecoreSvg },
    { id: 'node', label: 'Node', categories: ['nodes'], svg: nodeSvg },
    { id: 'cluster', label: 'Cluster', categories: ['nodes'], svg: clusterSvg },
    { id: 'portal', label: 'Portal', categories: ['nodes'], svg: portalSvg },
    { id: 'playground', label: 'Playground', categories: ['nodes'], svg: playgroundSvg },
    { id: 'link', label: 'Link', categories: ['graph'], svg: linkSvg },
    { id: 'group', label: 'Group', categories: ['graph'], svg: groupSvg },
    { id: 'glyph', label: 'Glyph', categories: ['meta'], svg: glyphSvg },
    { id: 'pointer', label: 'Pointer', categories: ['actions'], svg: pointerSvg },
    { id: 'link-action', label: 'Link', categories: ['actions'], svg: linkActionSvg },
    { id: 'rename', label: 'Rename', categories: ['actions'], svg: renameSvg },
    { id: 'delete', label: 'Delete', categories: ['actions'], svg: deleteSvg },
    { id: 'fold', label: 'Fold', categories: ['actions'], svg: foldSvg },
    { id: 'unfold', label: 'Unfold', categories: ['actions'], svg: unfoldSvg },
    { id: 'area', label: 'Area', categories: ['actions'], svg: areaSvg },
    { id: 'ungroup', label: 'Ungroup', categories: ['actions'], svg: ungroupSvg }
];

export const GLYPH_CATEGORIES: CustomGlyphCategory[] = [
    { id: 'core', label: 'Core', glyphs: ['core', 'archecore'] },
    { id: 'nodes', label: 'Nodes', glyphs: ['node', 'cluster', 'portal', 'playground'] },
    { id: 'graph', label: 'Graph', glyphs: ['link', 'group'] },
    { id: 'meta', label: 'Meta', glyphs: ['glyph'] }
];

export const getGlyphById = (id?: string | null) => {
    if (!id) return undefined;
    return CUSTOM_GLYPHS.find(glyph => glyph.id === id);
};
