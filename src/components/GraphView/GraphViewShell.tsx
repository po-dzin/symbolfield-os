import React from 'react';

type Props = {
  world?: React.ReactNode;
  topbar?: React.ReactNode;
  drawers?: React.ReactNode;
  overlays?: React.ReactNode;
};

export default function GraphViewShell({ world, topbar, drawers, overlays }: Props) {
  return (
    <div className="relative w-full h-full">
      {topbar}
      {world}
      {drawers}
      {overlays}
    </div>
  );
}
