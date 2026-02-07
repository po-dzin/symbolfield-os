import React from 'react';

type Props = {
  world?: React.ReactNode;
  topbar?: React.ReactNode;
  drawers?: React.ReactNode;
};

export default function GraphViewShell({ world, topbar, drawers }: Props) {
  return (
    <div className="relative w-full h-full">
      {topbar}
      {world}
      {drawers}
    </div>
  );
}
