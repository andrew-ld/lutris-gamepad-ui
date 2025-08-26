import { useMemo, useCallback, useEffect, useRef } from "react";
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
import { useTranslation } from "../contexts/TranslationContext";

export const BluetoothMenuFocusId = "BluetoothMenu";

const BluetoothMenu = ({ onClose }) => {
  const { t } = useTranslation();
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
  const currentMenuItem = useRef(null);

  const handleDeviceAction = useCallback(
    (device) => {
      const targetName = device.name || device.address;

      const title = device.isConnected
        ? t('Disconnect from "{{targetName}}"?', { targetName })
        : t('Connect to "{{targetName}}"?', { targetName });

      const description = device.isConnected
        ? t("The device will be disconnected from the system.")
        : t("Attempting to establish a connection with the device.");

      showModal((hideThisModal) => (
        <ConfirmationDialog
          message={title}
          description={description}
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
    [showModal, connectDevice, disconnectDevice, t]
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
        label: t("Power on {{adapterName}}", {
          adapterName: adapter.name || t("Bluetooth"),
        }),
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
  }, [devices, adapters, handleDeviceAction, powerOnAdapter, t]);

  const renderItem = useCallback(
    (item, isFocused, onMouseEnter) => {
      const actionButtonLabel = item.isAdapter
        ? t("Power On")
        : item.device.isConnected
        ? t("Disconnect")
        : t("Connect");

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
              <span className="bt-status-indicator connected">
                {t("Connected")}
              </span>
            )}
            {!item.device?.isConnected && item.device?.isPaired && (
              <span className="bt-status-indicator paired">{t("Paired")}</span>
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
    },
    [t]
  );

  const legendItems = useMemo(
    () => [
      {
        button: "A",
        label: t("Select"),
        onClick: () => {
          currentMenuItem.current?.action();
        },
      },
      {
        button: "X",
        label: isDiscovering ? t("Stop discovery") : t("Start discovery"),
        onClick: isDiscovering ? stopDiscovery : startDiscovery,
      },
      { button: "Y", label: t("Refresh"), onClick: forceRefresh },
      { button: "B", label: t("Close"), onClick: onClose },
    ],
    [onClose, isDiscovering, startDiscovery, stopDiscovery, forceRefresh, t]
  );

  useEffect(() => {
    forceRefresh();
  }, [forceRefresh]);

  useEffect(() => {
    return () => {
      if (isDiscovering) {
        stopDiscovery();
      }
    };
  }, [isDiscovering, stopDiscovery]);

  return (
    <div className="bt-menu-container">
      <LegendaContainer legendItems={legendItems}>
        <div className="bt-menu-content">
          <h2 className="bt-menu-title">{t("Bluetooth Settings")}</h2>
          {isLoading && !isDiscovering ? (
            <LoadingIndicator />
          ) : (
            <RowBasedMenu
              items={menuItems}
              renderItem={renderItem}
              onAction={handleAction}
              focusId={BluetoothMenuFocusId}
              itemKey={(item) => item.id}
              onFocusChange={(item) => {
                currentMenuItem.current = item;
              }}
              emptyMessage={t(
                "No devices found. Ensure Bluetooth is powered on and press 'X' to start discovery."
              )}
            />
          )}
        </div>
      </LegendaContainer>
    </div>
  );
};

export default BluetoothMenu;
