/**
 * Settings interface and management for Excalink Plugin
 * Day 7: Settings & Release - Plugin configuration options
 */

export interface ExcalinkSettings {
    // Core functionality settings
    enableFrameSuggestions: boolean;
    enableDebouncing: boolean;
    debounceDelay: number;
    
    // Modal behavior settings
    enableFuzzySearch: boolean;
    showRecentFramesFirst: boolean;
    maxSuggestionsDisplayed: number;
    
    // Performance settings
    enableCaching: boolean;
    enableFileWatching: boolean;
    maxCacheSize: number;
    
    // Debug and logging settings
    enableDebugLogging: boolean;
    showDiagnosticsInNotices: boolean;
    
    // UI preferences
    modalTheme: 'default' | 'minimal';
    showFrameIcons: boolean;
    showFileContext: boolean;
}

export const DEFAULT_SETTINGS: ExcalinkSettings = {
    // Core functionality (enabled by default)
    enableFrameSuggestions: true,
    enableDebouncing: true,
    debounceDelay: 300, // milliseconds
    
    // Modal behavior (optimized defaults)
    enableFuzzySearch: true,
    showRecentFramesFirst: true,
    maxSuggestionsDisplayed: 50,
    
    // Performance (enabled for best experience)
    enableCaching: true,
    enableFileWatching: true,
    maxCacheSize: 100, // files
    
    // Debug (disabled in production)
    enableDebugLogging: false,
    showDiagnosticsInNotices: false,
    
    // UI (default theme)
    modalTheme: 'default',
    showFrameIcons: true,
    showFileContext: true
};
