import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import * as ipc from "../utils/ipc";
import { useIsMounted } from "../hooks/useIsMounted";

const BluetoothStateContext = createContext(null);
const BluetoothActionsContext = createContext(null);

export const useBluetoothState = () => useContext(BluetoothStateContext);
export const useBluetoothActions = () => useContext(BluetoothActionsContext);

export const BluetoothProvider = ({ children }) => {
  const [devices, setDevices] = useState([]);
  const [adapters, setAdapters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const isMounted = useIsMounted();

  useEffect(() => {
    setIsLoading(true);
    ipc
      .bluetoothGetState()
      .then(({ devices, adapters }) => {
        if (isMounted()) {
          setDevices(devices);
          setAdapters(adapters);
        }
      })
      .catch((err) => ipc.logError("Failed to get initial BT state:", err))
      .finally(() => {
        if (isMounted()) {
          setIsLoading(false);
        }
      });

    const handleStateChanged = ({ devices, adapters }) => {
      setDevices(devices);
      setAdapters(adapters);
      if (adapters?.some((a) => a.discovering)) {
        setIsDiscovering(true);
      } else {
        setIsDiscovering(false);
      }
    };

    const unsubscribe = ipc.onBluetoothStateChanged(handleStateChanged);

    return () => unsubscribe();
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
        if (isMounted()) {
          setDevices(devices);
          setAdapters(adapters);
        }
      })
      .catch((err) => ipc.logError("Failed to force refresh BT devices:", err))
      .finally(() => {
        if (isMounted()) {
          setIsLoading(false);
        }
      });
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
