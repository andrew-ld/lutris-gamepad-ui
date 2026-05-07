import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

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

export const useModalActions = () =>
  useModalStore(
    useShallow((state) => ({
      showModal: state.showModal,
      hideModal: state.hideModal,
    })),
  );

export const useModalState = () =>
  useModalStore(
    useShallow((state) => ({
      modals: state.modals,
      isModalOpen: state.modals.length > 0,
      topModal: state.modals.length > 0 ? state.modals.at(-1) : null,
    })),
  );
