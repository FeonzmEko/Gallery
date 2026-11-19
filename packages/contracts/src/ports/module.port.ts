/**
 * Archive Module Definition and Registration Port
 *
 * Each business module (core, media, travel, journal, etc.) exports an ArchiveModuleDefinition
 * to register routes and capabilities cleanly without tight coupling.
 */

export interface ArchiveModuleDefinition<TApp = unknown, TDeps = unknown> {
  /**
   * Unique module identifier (e.g. 'core', 'media', 'journal', 'travel')
   */
  readonly moduleId: string;

  /**
   * Associated EntryType name handled by this module (e.g. 'trip', 'journal', 'photo')
   */
  readonly entryType?: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Short description of module capabilities
   */
  readonly description?: string;

  /**
   * Semantic version string
   */
  readonly version?: string;

  /**
   * Route mounting hook executed during Workers API bootstrap
   */
  mountRoutes?(app: TApp, deps: TDeps): void;

  /**
   * Optional data export handler for full backup and migration
   */
  exportData?(): Promise<unknown>;
}
