// Type definitions for Maven configuration (English-only comments)
// Represents a single Maven configuration entry with minimal required fields.
export type MavenConfigEntry = {
  id: string;   // Unique identifier for the config entry
  name: string; // Human-readable name
  path: string; // Absolute or project-relative path to the config file/directory
};

// Optional: list type alias for collections of Maven configuration entries
export type MavenConfigList = MavenConfigEntry[];