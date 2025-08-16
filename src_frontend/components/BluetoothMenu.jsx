import { useMemo, useCallback, useEffect } from "react";
import {
  useBluetoothState,
  useBluetoothActions,
} from "../contexts/BluetoothContext";
import { useModalActions } from "../contexts/ModalContext";
import LegendaContainer from "./LegendaContainer";
import RowBasedMenu from "./RowBasedMenu";
import FocusableRow from "./FocusableRow";
import LoadingIndicator from "./LoadingIndicator";
import ConfirmationDialog from "./ConfirmationDialog";
import "../styles/BluetoothMenu.css";

export const BluetoothMenuFocusId = "BluetoothMenu";

const BluetoothMenu = ({ onClose }) => {
  const { devices, adapters, isLoading, isDiscovering } = useBluetoothState();
  const {
    startDiscovery,
    stopDiscovery,
    connectDevice,
    disconnectDevice,
    forceRefresh,
    powerOnAdapter,
  } = useBluetoothActions();
  const { showModal } = useModalActions();

  const handleDeviceAction = useCallback(
    (device) => {
      const action = device.isConnected ? "Disconnect from" : "Connect to";
      const targetName = device.name || device.address;
      showModal((hideThisModal) => (
        <ConfirmationDialog
          message={`${action}\n"${targetName}"?`}
          onConfirm={() => {
            if (device.isConnected) {
              disconnectDevice(device.path);
            } else {
              connectDevice(device.path);
            }
            hideThisModal();
          }}
          onDeny={hideThisModal}
        />
      ));
    },
    [showModal, connectDevice, disconnectDevice]
  );

  const handleAction = useCallback(
    (actionName, item) => {
      switch (actionName) {
        case "B":
          onClose();
          break;
        case "A":
          if (item?.action) {
            item.action();
          }
          break;
        case "X":
          if (isDiscovering) {
            stopDiscovery();
          } else {
            startDiscovery();
          }
          break;
        case "Y":
          forceRefresh();
          break;
      }
    },
    [onClose, isDiscovering, startDiscovery, stopDiscovery, forceRefresh]
  );

  const menuItems = useMemo(() => {
    const powerOnItems = (adapters || [])
      .filter((a) => !a.powered)
      .map((adapter) => ({
        id: adapter.path,
        label: `Power on ${adapter.name || "Bluetooth"}`,
        action: () => powerOnAdapter(adapter.path),
        isAdapter: true,
      }));

    const deviceItems = devices
      .slice()
      .sort((a, b) => {
        if (a.isConnected !== b.isConnected) return a.isConnected ? -1 : 1;
        if (a.isPaired !== b.isPaired) return a.isPaired ? -1 : 1;
        return (a.name || a.address).localeCompare(b.name || b.address);
      })
      .map((device) => ({
        id: device.address,
        label: device.name || device.address,
        action: () => handleDeviceAction(device),
        isDevice: true,
        device,
      }));

    return [...powerOnItems, ...deviceItems];
  }, [devices, adapters, handleDeviceAction, powerOnAdapter]);

  const renderItem = useCallback((item, isFocused, onMouseEnter) => {
    const actionButtonLabel = item.isAdapter
      ? "Power On"
      : item.device.isConnected
      ? "Disconnect"
      : "Connect";

    return (
      <FocusableRow
        key={item.id}
        isFocused={isFocused}
        onMouseEnter={onMouseEnter}
        onClick={item.action}
      >
        <div className="bt-menu-row-content">
          <span className="bt-menu-row-label">{item.label}</span>
          {item.device?.isConnected && (
            <span className="bt-status-indicator connected">Connected</span>
          )}
          {!item.device?.isConnected && item.device?.isPaired && (
            <span className="bt-status-indicator paired">Paired</span>
          )}
        </div>
        <div className="bt-menu-row-right">
          <button
            className="bt-menu-action-button"
            onClick={(e) => {
              e.stopPropagation();
              if (item.action) item.action();
            }}
          >
            {actionButtonLabel}
          </button>
        </div>
      </FocusableRow>
    );
  }, []);

  const legendItems = useMemo(
    () => [
      { button: "A", label: "Select" },
      {
        button: "X",
        label: isDiscovering ? "Stop discovery" : "Start discovery",
        onClick: isDiscovering ? stopDiscovery : startDiscovery,
      },
      { button: "Y", label: "Refresh", onClick: forceRefresh },
      { button: "B", label: "Close", onClick: onClose },
    ],
    [onClose, isDiscovering, startDiscovery, stopDiscovery, forceRefresh]
  );

  useEffect(() => {
    forceRefresh();
  }, []);

  return (
    <div className="bt-menu-container">
      <LegendaContainer legendItems={legendItems}>
        <div className="bt-menu-content">
          <h2 className="bt-menu-title">Bluetooth Settings</h2>
          {isLoading && !isDiscovering ? (
            <LoadingIndicator message="Loading..." />
          ) : (
            <RowBasedMenu
              items={menuItems}
              renderItem={renderItem}
              onAction={handleAction}
              focusId={BluetoothMenuFocusId}
              itemKey={(item) => item.id}
            />
          )}
        </div>
      </LegendaContainer>
    </div>
  );
};

export default BluetoothMenu;
