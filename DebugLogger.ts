/**
 * Debug Logger Utility for Excalink Plugin
 * Provides conditional logging based on user settings
 */
import { ExcalinkSettings } from "settings";

export class DebugLogger {
    private settings: ExcalinkSettings;

    constructor(settings: ExcalinkSettings) {
        this.settings = settings;
    }

    /**
     * Log debug information only if debug logging is enabled
     */
    log(message: string, ...args: any[]): void {
        if (this.settings.enableDebugLogging) {
            console.log(message, ...args);
        }
    }

    /**
     * Log warnings (always shown regardless of debug setting)
     */
    warn(message: string, ...args: any[]): void {
        console.warn(message, ...args);
    }

    /**
     * Log errors (always shown regardless of debug setting)
     */
    error(message: string, ...args: any[]): void {
        console.error(message, ...args);
    }

    /**
     * Update settings reference when settings change
     */
    updateSettings(settings: ExcalinkSettings): void {
        this.settings = settings;
    }
}
