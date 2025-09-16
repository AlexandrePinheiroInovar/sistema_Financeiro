import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

interface ProgressModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  progress?: string;
  isLoading?: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
  progressPercentage?: number;
  currentStep?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isDestructive = false
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          margin: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          zIndex: 10000
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '8px'
          }}>
            {title}
          </h3>
          <p style={{
            color: '#6b7280'
          }}>
            {message}
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              color: 'white',
              backgroundColor: isDestructive ? '#dc2626' : '#2563eb',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  title,
  message,
  progress,
  isLoading = false,
  onClose,
  showCloseButton = false,
  progressPercentage = 0,
  currentStep
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      style={{ zIndex: 9999 }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        style={{ zIndex: 10000 }}
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {title}
          </h3>

          {isLoading && (
            <div className="mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}

          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            {message}
          </p>

          {/* Barra de Progresso */}
          {(progressPercentage > 0 || isLoading) && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progressPercentage}%`,
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: '14px'
              }}>
                <span style={{ color: '#6b7280' }}>
                  {Math.round(progressPercentage)}%
                </span>
                {currentStep && (
                  <span style={{ color: '#3b82f6' }}>
                    {currentStep}
                  </span>
                )}
              </div>
            </div>
          )}

          {progress && (
            <p style={{
              fontSize: '14px',
              color: '#3b82f6',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {progress}
            </p>
          )}

          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};