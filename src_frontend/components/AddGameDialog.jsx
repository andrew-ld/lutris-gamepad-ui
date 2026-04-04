import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLutrisActions } from "../contexts/LutrisContext";
import { useToastActions } from "../contexts/ToastContext";
import { useTranslation } from "../contexts/TranslationContext";
import { useIsMounted } from "../hooks/useIsMounted";
import * as api from "../utils/ipc";

import DialogLayout from "./DialogLayout";
import FocusableRow from "./FocusableRow";
import LoadingIndicator from "./LoadingIndicator";
import OnScreenKeyboard from "./OnScreenKeyboard";
import RowBasedMenu from "./RowBasedMenu";
import SelectionMenu from "./SelectionMenu";
import ToggleButton from "./ToggleButton";

import "../styles/AddGameDialog.css";
import "../styles/SettingsMenu.css";

const AddGameDialogFocusId = "AddGameDialog";
const SELECT_CURRENT_DIRECTORY = "__select_current_directory__";
const NAVIGATE_PARENT = "__navigate_parent__";

const slugifyValue = (value) => {
	return String(value || "")
		.normalize("NFKD")
		.replace(/[^\w\s-]/g, "")
		.trim()
		.toLowerCase()
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
};

const isPathLikeType = (type) => {
	const normalized = String(type || "").toLowerCase();
	return (
		normalized.includes("path") ||
		normalized.includes("directory") ||
		normalized.includes("folder") ||
		normalized.includes("file")
	);
};

const isPathLikeKey = (key) => {
	return /(path|dir|directory|folder|file|executable|binary|rom)/i.test(
		String(key || ""),
	);
};

const isPathLikeItem = (item) => {
	if (!item) {
		return false;
	}

	return isPathLikeType(item.type) || isPathLikeKey(item.key);
};

const getOptionInitialValue = (option) => {
	if (option.value !== undefined && option.value !== null) {
		return option.value;
	}

	if (option.default !== undefined && option.default !== null) {
		return option.default;
	}

	if (option.type === "bool") {
		return false;
	}

	return "";
};

const AddGameDialog = ({ onClose, maxWidth = "860px" }) => {
	const { t } = useTranslation();
	const { showToast } = useToastActions();
	const { fetchGames } = useLutrisActions();
	const isMounted = useIsMounted();

	const [loadingRunners, setLoadingRunners] = useState(true);
	const [loadingSettings, setLoadingSettings] = useState(false);
	const [saving, setSaving] = useState(false);

	const [focusedItem, setFocusedItem] = useState(null);
	const [selectingItem, setSelectingItem] = useState(null);
	const [keyboardItem, setKeyboardItem] = useState(null);
	const [menuState, setMenuState] = useState({
		activeSectionIndex: 0,
		selectedIndex: 0,
	});

	const [pathBrowserState, setPathBrowserState] = useState(null);

	const [runners, setRunners] = useState([]);
	const [gameInfo, setGameInfo] = useState({});

	const [optionsBySection, setOptionsBySection] = useState({
		game: [],
		runner: [],
		system: [],
	});
	const [tabDefinitions, setTabDefinitions] = useState([]);
	const [gameInfoFields, setGameInfoFields] = useState([]);

	const [optionValues, setOptionValues] = useState({
		game: {},
		runner: {},
		system: {},
	});
	const initializedRef = useRef(false);

	const runnerChoices = useMemo(() => {
		return runners.map((runner) => [runner.human_name, runner.name]);
	}, [runners]);

	const updateGameInfo = useCallback((key, value) => {
		setGameInfo((previous) => ({ ...previous, [key]: value }));
	}, []);

	const getGameInfoValue = useCallback(
		(key) => {
			if (key === "slug") {
				const explicitSlug = gameInfo[key];
				if (explicitSlug !== undefined && explicitSlug !== null && String(explicitSlug).trim() !== "") {
					return explicitSlug;
				}
				return slugifyValue(gameInfo.name);
			}

			return gameInfo[key] ?? "";
		},
		[gameInfo],
	);

	const updateOptionValue = useCallback((section, key, value) => {
		setOptionValues((previous) => ({
			...previous,
			[section]: {
				...previous[section],
				[key]: value,
			},
		}));
	}, []);

	const openKeyboardForOption = useCallback(
		(item) => {
			setKeyboardItem({
				target: "option",
				label: item.label,
				initialValue: item.value,
				item,
			});
		},
		[],
	);

	const fetchSettingsForRunner = useCallback(
		async (runnerSlug) => {
			if (!runnerSlug) {
				setOptionsBySection({ game: [], runner: [], system: [] });
				setTabDefinitions([]);
				setGameInfoFields([]);
				setOptionValues({ game: {}, runner: {}, system: {} });
				return;
			}

			setLoadingSettings(true);
			try {
				const data = await api.getLutrisSettings(null, runnerSlug);
				if (!isMounted()) {
					return;
				}

				setTabDefinitions(data?.tabs || []);
				setGameInfoFields(data?.game_info_fields || []);

				const nextOptions = {};
				for (const tab of data?.tabs || []) {
					if (tab.kind !== "options" || !tab.section) {
						continue;
					}

					nextOptions[tab.section] = data?.settings?.[tab.section] || [];
				}

				setOptionsBySection(nextOptions);
				setOptionValues((previous) => {
					const next = {};

					for (const sectionName of Object.keys(nextOptions)) {
						next[sectionName] = {};
						for (const option of nextOptions[sectionName]) {
							const previousValue = previous[sectionName]?.[option.key];
							next[sectionName][option.key] =
								previousValue === undefined
									? getOptionInitialValue(option)
									: previousValue;
						}
					}

					return next;
				});
			} finally {
				if (isMounted()) {
					setLoadingSettings(false);
				}
			}
		},
		[isMounted],
	);

	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;

		const loadRunners = async () => {
			setLoadingRunners(true);
			try {
				const data = await api.getLutrisRunners();
				if (!isMounted()) {
					return;
				}

				const availableRunners = data?.runners || [];
				setRunners(availableRunners);

				if (availableRunners.length === 0) {
					showToast({ title: t("No Lutris runners available"), type: "error" });
					onClose();
				} else {
					const initialRunner = availableRunners[0].name;
					setGameInfo((previous) => ({
						...previous,
						runner: previous.runner || initialRunner,
					}));
					await fetchSettingsForRunner(initialRunner);
				}
			} catch {
				if (isMounted()) {
					showToast({ title: t("Failed to fetch Lutris runners"), type: "error" });
					onClose();
				}
			} finally {
				if (isMounted()) {
					setLoadingRunners(false);
				}
			}
		};

		loadRunners();
	}, [fetchSettingsForRunner, isMounted, onClose, showToast, t]);

	const openKeyboardForItem = useCallback(
		(item) => {
			setKeyboardItem({
				target: "game_info",
				label: item.label,
				initialValue: item.value,
				item,
			});
		},
		[],
	);

	const browsePath = useCallback(
		async (path, targetItem) => {
			try {
				const next = await api.browseLutrisPath(path || ".");
				if (!isMounted()) {
					return;
				}
				setPathBrowserState({
					data: next,
					targetItem,
				});
			} catch {
				if (isMounted()) {
					showToast({ title: t("Failed to browse path"), type: "error" });
				}
			}
		},
		[isMounted, showToast, t],
	);

	const openPathBrowserForItem = useCallback(
		async (item) => {
			const initialPath = String(item.value || "").trim() || "~";
			await browsePath(initialPath, item);
		},
		[browsePath],
	);

	const getSectionPayload = useCallback(
		(sectionName) => {
			const options = optionsBySection[sectionName] || [];
			const values = optionValues[sectionName] || {};
			const payload = {};

			for (const option of options) {
				const value = values[option.key];
				if (option.type === "bool") {
					payload[option.key] = Boolean(value);
				} else if (value !== "" && value !== null && value !== undefined) {
					payload[option.key] = value;
				}
			}

			return payload;
		},
		[optionValues, optionsBySection],
	);

	const onSave = useCallback(async () => {
		const name = String(getGameInfoValue("name")).trim();
		const runner = String(getGameInfoValue("runner")).trim();

		if (!name) {
			showToast({ title: t("Please fill in the name"), type: "error" });
			return;
		}

		if (!runner) {
			showToast({ title: t("Runner not provided"), type: "error" });
			return;
		}

		const gameInfoPayload = Object.fromEntries(
			gameInfoFields.map((field) => [field.key, getGameInfoValue(field.key)]),
		);

		setSaving(true);
		try {
			await api.addLutrisLocalGame({
				...gameInfoPayload,
				name,
				runner,
				options: {
					game: getSectionPayload("game"),
					runner: getSectionPayload("runner"),
					system: getSectionPayload("system"),
				},
			});

			await fetchGames();
			showToast({ title: t("Game added"), type: "success" });
			onClose();
		} catch {
			showToast({ title: t("Failed to add game"), type: "error" });
		} finally {
			if (isMounted()) {
				setSaving(false);
			}
		}
	}, [
		fetchGames,
		gameInfoFields,
		getGameInfoValue,
		getSectionPayload,
		isMounted,
		onClose,
		showToast,
		t,
	]);

	const menuSections = useMemo(() => {
		return tabDefinitions.map((tab) => {
			if (tab.kind === "game_info") {
				return {
					id: tab.id,
					label: t(tab.label),
					items: gameInfoFields.map((field) => ({
						id: `${tab.id}-${field.key}`,
						kind: "game_info",
						key: field.key,
						label: t(field.label),
						value: getGameInfoValue(field.key),
						type: field.type,
					})),
				};
			}

			return {
				id: tab.id,
				label: t(tab.label),
				items: (optionsBySection[tab.section] || []).map((option) => ({
					id: `${tab.section}-${option.key}`,
					kind: "option",
					section: tab.section,
					key: option.key,
					label: option.label || option.key,
					type: option.type,
					value: optionValues[tab.section]?.[option.key],
					choices: option.choices,
				})),
			};
		});
	}, [
		gameInfoFields,
		getGameInfoValue,
		optionValues,
		optionsBySection,
		t,
		tabDefinitions,
	]);

	const renderMenuItem = useCallback(
		(item, isFocused, onMouseEnter) => {
			let control = null;

			if (item.kind === "option" && item.type === "bool") {
				control = (
					<ToggleButton
						isToggledOn={!!item.value}
						labelOn={t("Disable")}
						labelOff={t("Enable")}
					/>
				);
			} else if (item.kind === "option" && item.choices && item.choices.length > 0) {
				const found = item.choices.find(
					(choice) => String(choice[1]) === String(item.value),
				);
				control = <div className="settings-menu-value">{found ? found[0] : t("Default")}</div>;
			} else if (item.kind === "game_info" && item.key === "runner") {
				const selectedRunner = runnerChoices.find(
					(choice) => String(choice[1]) === String(item.value),
				);
				control = (
					<div className="settings-menu-value">{selectedRunner ? selectedRunner[0] : t("Select")}</div>
				);
			} else {
				control = <div className="settings-menu-value">{item.value || t("Set")}</div>;
			}

			return (
				<FocusableRow
					key={item.id}
					isFocused={isFocused}
					onMouseEnter={onMouseEnter}
					onClick={() => {
						if (item.kind === "game_info" && item.key === "runner") {
							setSelectingItem({ type: "runner" });
						} else if (isPathLikeItem(item)) {
							openPathBrowserForItem(item);
						} else if (item.kind === "game_info") {
							openKeyboardForItem(item);
						} else if (item.type === "bool") {
							updateOptionValue(item.section, item.key, !item.value);
						} else if (item.choices && item.choices.length > 0) {
							setSelectingItem({ type: "option", item });
						} else if (item.kind === "option") {
							openKeyboardForOption(item);
						}
					}}
				>
					<span className="settings-menu-label">{item.label}</span>
					{control}
				</FocusableRow>
			);
		},
		[
			openKeyboardForItem,
			openKeyboardForOption,
			openPathBrowserForItem,
			runnerChoices,
			t,
			updateOptionValue,
		],
	);

	const handleMenuAction = useCallback(
		(actionName, item) => {
			if (actionName === "B") {
				onClose();
				return;
			}

			if (actionName === "X") {
				onSave();
				return;
			}

			if (actionName !== "A" || !item) {
				return;
			}

			if (item.kind === "game_info" && item.key === "runner") {
				setSelectingItem({ type: "runner" });
			} else if (isPathLikeItem(item)) {
				openPathBrowserForItem(item);
			} else if (item.kind === "game_info") {
				openKeyboardForItem(item);
			} else if (item.type === "bool") {
				updateOptionValue(item.section, item.key, !item.value);
			} else if (item.choices && item.choices.length > 0) {
				setSelectingItem({ type: "option", item });
			} else if (item.kind === "option") {
				openKeyboardForOption(item);
			}
		},
		[
			onClose,
			onSave,
			openKeyboardForItem,
			openKeyboardForOption,
			openPathBrowserForItem,
			updateOptionValue,
		],
	);

	const legendItems = useMemo(() => {
		const sectionButtons =
			menuSections.length > 1
				? [
						{ button: "L1", label: t("Prev") },
						{ button: "R1", label: t("Next") },
					]
				: [];

		const actionButtons = [];
		if (focusedItem) {
			let actionLabel = t("Select");
			if (focusedItem.kind === "option" && focusedItem.type === "bool") {
				actionLabel = focusedItem.value ? t("Disable") : t("Enable");
			}
			actionButtons.push({ button: "A", label: actionLabel });
		}

		return [
			...sectionButtons,
			...actionButtons,
			{ button: "X", label: t("Save"), onClick: onSave },
			{ button: "B", label: t("Close"), onClick: onClose },
		];
	}, [focusedItem, menuSections.length, onClose, onSave, t]);

	if (selectingItem?.type === "runner") {
		return (
			<SelectionMenu
				title={t("Runner")}
				options={runnerChoices}
				currentValue={getGameInfoValue("runner")}
				maxWidth={maxWidth}
				onSelect={async (runnerSlug) => {
					updateGameInfo("runner", runnerSlug);
					await fetchSettingsForRunner(runnerSlug);
					setSelectingItem(null);
				}}
				onClose={() => setSelectingItem(null)}
			/>
		);
	}

	if (selectingItem?.type === "option") {
		const { item } = selectingItem;
		return (
			<SelectionMenu
				title={item.label}
				options={item.choices || []}
				currentValue={item.value}
				maxWidth={maxWidth}
				onSelect={(newValue) => {
					updateOptionValue(item.section, item.key, newValue);
					setSelectingItem(null);
				}}
				onClose={() => setSelectingItem(null)}
			/>
		);
	}

	if (keyboardItem) {
		return (
			<OnScreenKeyboard
				label={keyboardItem.label}
				initialValue={String(keyboardItem.initialValue || "")}
				onConfirm={(value) => {
					if (keyboardItem.target === "option") {
						updateOptionValue(
							keyboardItem.item.section,
							keyboardItem.item.key,
							value,
						);
					} else {
						updateGameInfo(keyboardItem.item.key, value);
					}
					setKeyboardItem(null);
				}}
				onClose={() => setKeyboardItem(null)}
			/>
		);
	}

	if (pathBrowserState) {
		const { data, targetItem } = pathBrowserState;
		const isRootPath = data.path === data.parent;
		const options = [
			[t("Select this directory"), SELECT_CURRENT_DIRECTORY],
			...(isRootPath ? [] : [[t(".. (Parent Directory)"), NAVIGATE_PARENT]]),
			...data.entries.map((entry) => {
				const labelPrefix = entry.type === "directory" ? "[DIR]" : "[FILE]";
				const suffix = entry.type === "directory" ? "/" : "";
				return [`${labelPrefix} ${entry.name}${suffix}`, entry.path];
			}),
		];

		return (
			<SelectionMenu
				title={targetItem?.label || t("Directory")}
				description={data.path}
				options={options}
				currentValue={targetItem?.value}
				maxWidth={maxWidth}
				showCheckmark={false}
				onSelect={async (value) => {
					if (value === SELECT_CURRENT_DIRECTORY) {
						if (targetItem?.kind === "option") {
							updateOptionValue(targetItem.section, targetItem.key, data.path);
						} else if (targetItem) {
							updateGameInfo(targetItem.key, data.path);
						}
						setPathBrowserState(null);
						return;
					}

					if (value === NAVIGATE_PARENT) {
						await browsePath(data.parent, targetItem);
						return;
					}

					const entry = data.entries.find((item) => item.path === value);
					if (!entry) {
						return;
					}

					if (entry.type === "directory") {
						await browsePath(entry.path, targetItem);
					} else {
						if (targetItem?.kind === "option") {
							updateOptionValue(targetItem.section, targetItem.key, entry.path);
						} else if (targetItem) {
							updateGameInfo(targetItem.key, entry.path);
						}
						setPathBrowserState(null);
					}
				}}
				onClose={() => setPathBrowserState(null)}
			/>
		);
	}

	return (
		<DialogLayout
			title={t("Add game")}
			description={t("Create a local installed game entry in Lutris.")}
			legendItems={legendItems}
			maxWidth={maxWidth}
			scrollable={false}
		>
			{loadingRunners || loadingSettings ? (
				<div className="add-game-dialog-loading">
					<LoadingIndicator />
				</div>
			) : (
				<RowBasedMenu
					sections={menuSections}
					renderItem={renderMenuItem}
					onAction={handleMenuAction}
					onFocusChange={setFocusedItem}
					focusId={AddGameDialogFocusId}
					itemKey={(item) => item.id}
					initialSectionIndex={menuState.activeSectionIndex}
					initialSelectedIndex={menuState.selectedIndex}
					onStateChange={setMenuState}
					isActive={!saving}
				/>
			)}
		</DialogLayout>
	);
};

export default AddGameDialog;
