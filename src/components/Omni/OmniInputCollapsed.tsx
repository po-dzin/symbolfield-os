import React from 'react';

type Props = {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
};

export default function OmniInputCollapsed(props: Props) {
  const { className = '', inputClassName = '', placeholder = 'Search or type /command...' } = props;
  return (
    <div className={className}>
      <input className={inputClassName} placeholder={placeholder} />
    </div>
  );
}
