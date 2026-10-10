# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2024-10-10

### 🚀 Added
- **Core Engine & Architecture**:
  - Offline-first web application architecture built with Node.js, Express, and zero-configuration SQLite in WAL mode.
  - Sub-millisecond FTS5 full-text search index for catalog searches across Title, Author, ISBN, Publisher, and Categories.
  - Command Palette (`Ctrl+K` / `Cmd+K`) for rapid navigation and librarian keyboard workflows.
  - Progressive Web App (PWA) manifest and Service Worker caching for seamless offline usability and installability.

- **Role-Based Portals**:
  - **Student & Faculty Portal**: Search catalog, check live copy availability, view active loans, renew eligible items, track reading streaks, and view earned gamification badges.
  - **Librarian Circulation Desk**: Scan-first unified barcode/ID detector for instant checkout, return, renewal, and fine waiver.
  - **Administrator Dashboard**: System telemetry, audit logs, automated hot database backups, fine rate configuration, and role management.
  - **Event & Guest Pass Portal**: Multi-department event creation, guest pass generation with Code128 barcodes/QR codes, and scan-to-verify entrance desk.

- **Circulation & Automation**:
  - Support for multi-copy tracking under accession and barcode identifiers.
  - Automated fine calculation engine based on configurable per-day overdue rates and grace periods.
  - Overdue notification digest generator and reservation queuing system.
  - Procedural book cover generator generating harmonic SVG cover art without external image assets.
  - Client-side pure HTML5 Canvas confetti celebration on on-time returns.

- **Data Management & Tools**:
  - RFC-4180 compliant CSV import and export tool for bulk book catalog and member rosters.
  - One-click hot SQLite snapshot backup and restore utility.
  - Printable library ID cards and barcode sheets with native browser print CSS styling.
  - Multi-language localization support (English, Spanish, French, German, Hindi).

- **Testing & Quality Assurance**:
  - Automated integration and unit test suite verifying authentication, FTS5 queries, circulation transactions, fine computations, and guest pass lifecycles.
  - Cross-platform Windows `start.bat` runner with LAN IP auto-detection.
