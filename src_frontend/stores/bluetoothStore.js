import { useEffect } from "react";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import * as ipc from "../utils/ipc";

const hasDiscoveringAdapter = (adapters) =>
  Boolean(adapters?.some((adapter) => adapter.discovering));

export const useBluetoothStore = create((set, get) => ({
  devices: [],
  adapters: [],
  isLoading: true,
  isDiscovering: false,
  setBluetoothState: ({ devices, adapters }) => {
    set({
      devices,
      adapters,
      isDiscovering: hasDiscoveringAdapter(adapters),
    });
  },
  setLoading: (isLoading) => set({ isLoading }),
  powerOnAdapter: (adapterPath) => {
    ipc.bluetoothPowerOnAdapter(adapterPath);
  },
  startDiscovery: () => {
    ipc.bluetoothStartDiscovery();
    set({ isDiscovering: true });
  },
  stopDiscovery: () => {
    ipc.bluetoothStopDiscovery();
    set({ isDiscovering: false });
  },
  connectDevice: (devicePath) => {
    ipc.bluetoothConnect(devicePath);
  },
  disconnectDevice: (devicePath) => {
    ipc.bluetoothDisconnect(devicePath);
  },
  forceRefresh: () => {
    void ipc
      .bluetoothGetState()
      .then((state) => {
        get().setBluetoothState(state);
      })
      .catch((error) =>
        ipc.logError("Failed to force refresh BT devices:", error),
      )
      .finally(() => {
        set({ isLoading: false });
      });
  },
}));

export const useBluetoothState = () =>
  useBluetoothStore(
    useShallow((state) => ({
      devices: state.devices,
      adapters: state.adapters,
      isLoading: state.isLoading,
      isDiscovering: state.isDiscovering,
    })),
  );

export const useBluetoothActions = () =>
  useBluetoothStore(
    useShallow((state) => ({
      powerOnAdapter: state.powerOnAdapter,
      startDiscovery: state.startDiscovery,
      stopDiscovery: state.stopDiscovery,
      connectDevice: state.connectDevice,
      disconnectDevice: state.disconnectDevice,
      forceRefresh: state.forceRefresh,
    })),
  );

export const useInitializeBluetoothStore = () => {
  const setBluetoothState = useBluetoothStore(
    (state) => state.setBluetoothState,
  );
  const setLoading = useBluetoothStore((state) => state.setLoading);

  useEffect(() => {
    let isActive = true;

    void ipc
      .bluetoothGetState()
      .then((state) => {
        if (isActive) {
          setBluetoothState(state);
        }
      })
      .catch((error) => ipc.logError("Failed to get initial BT state:", error))
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    const unsubscribe = ipc.onBluetoothStateChanged(setBluetoothState);

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [setBluetoothState, setLoading]);
};
