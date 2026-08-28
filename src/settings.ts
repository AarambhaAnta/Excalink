export interface ExcalinkSettings {
	enableSuggestions: boolean;
	includeFrames: boolean;
	includeGroups: boolean;
	showRecentFirst: boolean;
	maxSuggestions: number;
	showFileContext: boolean;
}

export const DEFAULT_SETTINGS: ExcalinkSettings = {
	enableSuggestions: true,
	includeFrames: true,
	includeGroups: true,
	showRecentFirst: true,
	maxSuggestions: 50,
	showFileContext: true,
};
