import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ActionMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export default function ActionMenu({ isOpen, onToggle, onClose, children }: ActionMenuProps) {
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) onClose();
    };
    // Capture scroll events on any element (like the table container)
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`p-2 rounded-lg transition ${isOpen ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-40 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-100 animate-in fade-in zoom-in duration-200 w-48"
            style={{
              top: `${position.top}px`,
              right: `${position.right}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              {children}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
