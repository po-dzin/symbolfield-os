import React, { useEffect, useState } from 'react';
import { useOsShellStore } from '../../store/osShellStore';
import { useGraphStore } from '../../store/graphStore';
import { useStateStore } from '../../store/stateStore';

const ChronoCore = () => {
  const { activeNodeId } = useOsShellStore();
  const { nodes } = useGraphStore();
  const { mode, toneId } = useStateStore();
  
  // Find the active node
  const activeNode = nodes.find(node => node.id === activeNodeId);
  
  if (!activeNode) {
    return null;
  }

  // Get node glyph
  const glyphChar = activeNode.components?.glyph?.char || '●';
  
  // Get node state and XP
  const nodeState = activeNode.state || 'active';
  const xpData = activeNode.components?.xp || {};
  const xpValues = {
    hp: Math.max(0, xpData.hp || 0),
    ep: Math.max(0, xpData.ep || 0),
    mp: Math.max(0, xpData.mp || 0),
    sp: Math.max(0, xpData.sp || 0)
  };
  const xpTotal = xpValues.hp + xpValues.ep + xpValues.mp + xpValues.sp;
  const xpPercentage = Math.min(100, Math.max(0, xpTotal));
  
  const xpSegments = [
    { key: 'hp', value: xpValues.hp, color: '#8B4513' }, // HP (Earth) - Brown
    { key: 'ep', value: xpValues.ep, color: '#4169E1' }, // EP (Water) - Blue
    { key: 'mp', value: xpValues.mp, color: '#FF4500' }, // MP (Fire) - Orange-Red
    { key: 'sp', value: xpValues.sp, color: '#90EE90' }  // SP (Air) - Light Green
  ];
  const defaultShare = 1 / xpSegments.length;
  let cursor = 0;
  const gradientStops = xpSegments.map((segment, index) => {
    const share = xpTotal > 0 ? segment.value / xpTotal : defaultShare;
    const startDeg = cursor * 360;
    const endDeg = (index === xpSegments.length - 1) ? 360 : (cursor + share) * 360;
    cursor += share;
    return `${segment.color} ${startDeg}deg ${endDeg}deg`;
  });
  const xpRingStyle = {
    background: `conic-gradient(${gradientStops.join(', ')})`
  };
  
  // State colors
  const stateColors = {
    active: '#00FFFF',
    dormant: '#666666',
    focused: '#FFD700',
    archived: '#FF6B6B'
  };
  
  // Tone pulsing state
  const [pulseScale, setPulseScale] = useState(1);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseScale(1 + Math.sin(Date.now() / 2000) * 0.1); // 4 second pulse cycle
    }, 50);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="chrono-core">
      <div className="chrono-core-container">
        {/* Outer Ring - XP Quadrants */}
        <div className="chrono-ring hp-ring">
          <div className="xp-quadrant-ring" style={xpRingStyle} />
        </div>
        
        {/* Middle Ring - XP */}
        <div className="chrono-ring xp-ring">
          <svg viewBox="0 0 100 100" className="ring-svg">
            <circle
              className="ring-bg"
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="6"
            />
            <circle
              className="ring-fill"
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke="#FFD700"
              strokeWidth="6"
              strokeDasharray={`${xpPercentage} ${100 - xpPercentage}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
        </div>
        
        {/* Tone Ring - Pulsing */}
        <div 
          className="chrono-ring tone-ring"
          style={{ 
            transform: `scale(${pulseScale})`,
            transition: 'transform 0.1s ease-out'
          }}
        >
          <svg viewBox="0 0 100 100" className="ring-svg">
            <circle
              cx="50"
              cy="50"
              r="25"
              fill="none"
              stroke={stateColors[nodeState] || stateColors.active}
              strokeWidth="3"
              opacity="0.6"
            />
          </svg>
        </div>
        
        {/* Inner Core - Glyph */}
        <div className="chrono-glyph">
          <span className="glyph-text">{glyphChar}</span>
        </div>
      </div>
    </div>
  );
};

export default ChronoCore;
