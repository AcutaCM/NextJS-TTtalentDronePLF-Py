import React, { createContext, useContext, useState, ReactNode } from 'react';

interface QuickKnowledgeForm {
  title: string;
  category: string;
  tags: string;
  content: string;
}

type ModalType = 'knowledge' | null;

interface GlobalModalContextType {
  currentModal: ModalType;
  openModal: (type: ModalType) => void;
  closeModal: () => void;
  showQuickAddKnowledge: boolean;
  setShowQuickAddKnowledge: (show: boolean) => void;
  quickKnowledgeForm: QuickKnowledgeForm;
  setQuickKnowledgeForm: React.Dispatch<React.SetStateAction<QuickKnowledgeForm>>;
  handleQuickAddKnowledge: () => void;
  setHandleQuickAddKnowledge: (handler: () => void) => void;
}

const GlobalModalContext = createContext<GlobalModalContextType | undefined>(undefined);

interface GlobalModalProviderProps {
  children: ReactNode;
}

export const GlobalModalProvider: React.FC<GlobalModalProviderProps> = ({ children }) => {
  const [currentModal, setCurrentModal] = useState<ModalType>(null);
  const [showQuickAddKnowledge, setShowQuickAddKnowledge] = useState(false);
  const [quickKnowledgeForm, setQuickKnowledgeForm] = useState<QuickKnowledgeForm>({
    title: '',
    category: 'general',
    tags: '',
    content: ''
  });
  const [handleQuickAddKnowledge, setHandleQuickAddKnowledge] = useState<() => void>(() => () => {});

  const openModal = (type: ModalType) => {
    setCurrentModal(type);
    if (type === 'knowledge') {
      setShowQuickAddKnowledge(true);
    }
  };

  const closeModal = () => {
    setCurrentModal(null);
    setShowQuickAddKnowledge(false);
  };

  const value: GlobalModalContextType = {
    currentModal,
    openModal,
    closeModal,
    showQuickAddKnowledge,
    setShowQuickAddKnowledge,
    quickKnowledgeForm,
    setQuickKnowledgeForm,
    handleQuickAddKnowledge,
    setHandleQuickAddKnowledge
  };

  return (
    <GlobalModalContext.Provider value={value}>
      {children}
    </GlobalModalContext.Provider>
  );
};

export const useGlobalModal = (): GlobalModalContextType => {
  const context = useContext(GlobalModalContext);
  if (context === undefined) {
    throw new Error('useGlobalModal must be used within a GlobalModalProvider');
  }
  return context;
};