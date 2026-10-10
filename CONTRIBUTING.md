# Contributing to Apex LMS

Thank you for your interest in contributing to **Apex LMS**! We welcome contributions from developers, students, librarians, designers, and educators worldwide.

Whether you are fixing a typo, improving documentation, submitting a bug fix, or proposing a brand new feature, your help is warmly appreciated.

---

## 🧭 Code of Conduct

All contributors and maintainers are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please ensure interactions remain respectful, collaborative, and inclusive.

---

## 🛠️ Getting Started with Local Development

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher (`node -v`)
- **Git**: Installed on your system (`git --version`)

### 2. Fork and Clone
```bash
# Fork the repository on GitHub, then clone your fork:
git clone https://github.com/DG1128/Apex-Library.git
cd Apex-Library
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Environment and Seed Database
```bash
# Create local environment file
cp .env.example .env

# Seed the development database with sample books and members
npm run seed
```

### 5. Launch the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 🌿 Branch Naming Convention

Please create descriptive feature branches off the `main` branch:

- `feat/feature-name` — for new features (e.g., `feat/dark-mode-toggle`)
- `fix/bug-description` — for bug fixes (e.g., `fix/csv-import-empty-row`)
- `docs/page-or-topic` — for documentation updates (e.g., `docs/add-printer-setup`)
- `refactor/scope` — for code restructuring without behavior changes
- `test/test-scope` — for adding or modifying tests

---

## 💬 Commit Message Convention

We follow the **[Conventional Commits](https://www.conventionalcommits.org/)** specification:

```
<type>(<scope>): <short summary>

[optional body explaining rationale]

[optional footer(s) like Closes #123]
```

### Common Types:
- `feat`: A new user-facing feature or capability
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Formatting, missing semicolons, whitespace (no code logic changes)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Code changes improving performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Maintenance tasks, dependency updates, CI workflows

### Examples:
```bash
git commit -m "feat(circulation): add bulk barcode scan sound feedback"
git commit -m "fix(guest-pass): prevent check-in on expired pass timestamps"
git commit -m "docs(installation): clarify LAN firewall port allowance on Windows"
```

---

## 📏 Code Style Guidelines

- **Vanilla JavaScript**: Keep backend and frontend lightweight. Avoid adding heavy frontend frameworks (React/Vue/Angular) or heavy backend ORMs.
- **Zero Native Build Dependencies**: Do not introduce dependencies requiring C++ native build toolchains (like `node-gyp` or python compilation).
- **CSS Architecture**: Use CSS custom properties in `public/css/variables.css` for theming and colors.
- **Offline Self-Containment**: No external CDN scripts (`<script src="https://cdn...">`) or external fonts. All assets must remain 100% self-hosted and offline-capable.
- **Linting & Verification**: Run tests prior to submitting your PR:
  ```bash
  npm test
  ```

---

## 🚀 Submitting a Pull Request (PR)

1. **Keep PRs Focused**: A PR should ideally solve one issue or introduce one logical feature.
2. **Verify Tests**: Ensure all automated tests pass:
   ```bash
   npm run test:all
   ```
3. **Push to Your Fork**:
   ```bash
   git push origin feat/your-feature-name
   ```
4. **Open Pull Request**: Navigate to the upstream repository on GitHub and click **Compare & pull request**.
5. **Complete PR Template**: Fill out all sections in the pull request template so maintainers understand what was changed and how to test it.

---

## 💡 Reporting Issues

- **Bug Reports**: Use our [Bug Report Template](https://github.com/DG1128/Apex-Library/issues/new?template=bug_report.yml). Include system details, steps to reproduce, and expected vs actual behavior.
- **Feature Proposals**: Open a [Feature Request](https://github.com/DG1128/Apex-Library/issues/new?template=feature_request.yml) or start a conversation in GitHub Discussions.

Thank you for building Apex LMS with us! 🎉
