import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import * as ipc from "../utils/ipc";

const BluetoothStateContext = createContext(null);
const BluetoothActionsContext = createContext(null);

export const useBluetoothState = () => useContext(BluetoothStateContext);
export const useBluetoothActions = () => useContext(BluetoothActionsContext);

export const BluetoothProvider = ({ children }) => {
  const [devices, setDevices] = useState([]);
  const [adapters, setAdapters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    ipc
      .bluetoothGetState()
      .then(({ devices, adapters }) => {
        setDevices(devices);
        setAdapters(adapters);
      })
      .catch((err) => ipc.logError("Failed to get initial BT state:", err))
      .finally(() => setIsLoading(false));

    const handleStateChanged = ({ devices, adapters }) => {
      setDevices(devices);
      setAdapters(adapters);
      if (adapters?.some((a) => a.discovering)) {
        setIsDiscovering(true);
      } else {
        setIsDiscovering(false);
      }
    };

    ipc.onBluetoothStateChanged(handleStateChanged);

    return () => ipc.removeAllListeners("bluetooth-state-changed");
  }, []);

  const powerOnAdapter = useCallback((adapterPath) => {
    ipc.bluetoothPowerOnAdapter(adapterPath);
  }, []);

  const startDiscovery = useCallback(() => {
    ipc.bluetoothStartDiscovery();
    setIsDiscovering(true);
  }, []);

  const stopDiscovery = useCallback(() => {
    ipc.bluetoothStopDiscovery();
    setIsDiscovering(false);
  }, []);

  const connectDevice = useCallback((devicePath) => {
    ipc.bluetoothConnect(devicePath);
  }, []);

  const disconnectDevice = useCallback((devicePath) => {
    ipc.bluetoothDisconnect(devicePath);
  }, []);

  const forceRefresh = useCallback(() => {
    ipc
      .bluetoothGetState()
      .then(({ devices, adapters }) => {
        setDevices(devices);
        setAdapters(adapters);
      })
      .catch((err) => ipc.logError("Failed to force refresh BT devices:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const stateValue = useMemo(
    () => ({ devices, adapters, isLoading, isDiscovering }),
    [devices, adapters, isLoading, isDiscovering]
  );

  const actionsValue = useMemo(
    () => ({
      powerOnAdapter,
      startDiscovery,
      stopDiscovery,
      connectDevice,
      disconnectDevice,
      forceRefresh,
    }),
    [
      powerOnAdapter,
      startDiscovery,
      stopDiscovery,
      connectDevice,
      disconnectDevice,
      forceRefresh,
    ]
  );

  return (
    <BluetoothStateContext.Provider value={stateValue}>
      <BluetoothActionsContext.Provider value={actionsValue}>
        {children}
      </BluetoothActionsContext.Provider>
    </BluetoothStateContext.Provider>
  );
};
