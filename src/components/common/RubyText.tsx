import React from 'react';
import { RubySegment } from '@data/types';

interface RubyTextProps {
  ruby?: RubySegment[];
  kanji?: string;
  hiragana?: string;
  className?: string;
  rtClassName?: string;
}

export const RubyText: React.FC<RubyTextProps> = ({
  ruby,
  kanji,
  hiragana,
  className = 'text-base font-bold text-slate-800 dark:text-slate-100',
  rtClassName = 'text-[11px] font-medium text-sky-600 dark:text-sky-400 select-none'
}) => {
  if (ruby && ruby.length > 0) {
    return (
      <span className={`inline-flex items-baseline ${className}`}>
        {ruby.map((seg, idx) => (
          seg.ruby ? (
            <ruby key={idx} className="leading-none mx-[1px]" style={{ rubyPosition: 'over' }}>
              {seg.base}
              <rt className={rtClassName}>{seg.ruby}</rt>
            </ruby>
          ) : (
            <span key={idx}>{seg.base}</span>
          )
        ))}
      </span>
    );
  }
  return <span className={className}>{kanji || hiragana || ''}</span>;
};
