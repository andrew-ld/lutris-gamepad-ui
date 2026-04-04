import { useCallback } from "react";

import SelectionMenu from "./SelectionMenu";

const SELECT_CURRENT_DIRECTORY = "__select_current_directory__";
const NAVIGATE_PARENT = "__navigate_parent__";

const Pathfinder = ({
	data,
	targetItem,
	maxWidth,
	onNavigate,
	onSelectPath,
	onClose,
	t,
}) => {
	const handleSelect = useCallback(
		async (value) => {
			if (value === SELECT_CURRENT_DIRECTORY) {
				onSelectPath(targetItem, data.path);
				return;
			}

			if (value === NAVIGATE_PARENT) {
				await onNavigate(data.parent, targetItem);
				return;
			}

			const entry = data.entries.find((item) => item.path === value);
			if (!entry) {
				return;
			}

			if (entry.type === "directory") {
				await onNavigate(entry.path, targetItem);
			} else {
				onSelectPath(targetItem, entry.path);
			}
		},
		[data, targetItem, onSelectPath, onNavigate],
	);

	if (!data) {
		return null;
	}

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
			onSelect={handleSelect}
			onClose={onClose}
		/>
	);
};

export default Pathfinder;
