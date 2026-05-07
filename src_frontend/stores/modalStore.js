import { create } from "zustand";

let modalIdCounter = 0;

export const useModalStore = create((set, get) => ({
  modals: [],
  showModal: (renderContent) => {
    const modalId = modalIdCounter++;

    const hideThisModal = () => {
      set((state) => ({
        modals: state.modals.filter((modal) => modal.id !== modalId),
      }));
    };

    const content = renderContent(hideThisModal);
    const newModal = { id: modalId, content };

    set((state) => ({
      modals: [...state.modals, newModal],
    }));
  },
  hideModal: () => {
    const { modals } = get();
    if (modals.length === 0) {
      return;
    }

    set({ modals: modals.slice(0, -1) });
  },
}));

export const useModalActions = () => ({
  showModal: useModalStore((state) => state.showModal),
  hideModal: useModalStore((state) => state.hideModal),
});

export const useModalState = () => {
  const modals = useModalStore((state) => state.modals);

  return {
    modals,
    isModalOpen: modals.length > 0,
    topModal: modals.length > 0 ? modals.at(-1) : null,
  };
};
