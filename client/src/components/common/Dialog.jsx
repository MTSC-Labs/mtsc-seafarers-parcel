import React, { useEffect, createContext, useContext } from 'react';

const DialogContext = createContext(null);

export function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onOpenChange?.(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      <div
        className="dialog-overlay"
        onClick={() => onOpenChange?.(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
        }}
      >
        {children}
      </div>
    </DialogContext.Provider>
  );
}

export function DialogContent({ className = '', children, style = {} }) {
  const context = useContext(DialogContext);

  return (
    <div
      className={`dialog-content ${className}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1024px',
        height: '95vh',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => context?.onOpenChange?.(false)}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: '12px',
          right: '16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          zIndex: 10,
          transition: 'color 0.15s, background-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#0f172a';
          e.currentTarget.style.backgroundColor = '#f1f5f9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#64748b';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
      {children}
    </div>
  );
}

export function DialogHeader({ className = '', children, style = {} }) {
  return (
    <div
      className={`dialog-header ${className}`}
      style={{
        padding: '12px 20px',
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ className = '', children, style = {} }) {
  return (
    <h2
      className={`dialog-title ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '20px',
        fontWeight: 800,
        color: '#0f2744',
        margin: 0,
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

export function Gift({ className = '', size = 20, style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ color: '#d05535', ...style }}
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}
