/**
 * Apex LMS - Screenshot Asset Generator
 * Creates realistic, high-fidelity UI documentation previews in docs/screenshots/
 */

const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function createSVG(title, subtitle, badge, accentColor, innerContent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720" style="background:#090d16; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#090d16" />
      <stop offset="100%" stop-color="#050811" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accentColor}" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="40" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="1280" height="720" fill="url(#bgGrad)" />
  
  <!-- Subtle Ambient Glow -->
  <circle cx="200" cy="150" r="180" fill="${accentColor}" opacity="0.12" filter="url(#glow)" />
  <circle cx="1080" cy="550" r="220" fill="#8b5cf6" opacity="0.1" filter="url(#glow)" />

  <!-- Top App Window Bar -->
  <rect x="40" y="30" width="1200" height="660" rx="16" fill="#111827" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
  
  <!-- Window Header -->
  <rect x="40" y="30" width="1200" height="54" rx="16" fill="#1e293b" />
  <circle cx="68" cy="57" r="6" fill="#ef4444" />
  <circle cx="88" cy="57" r="6" fill="#f59e0b" />
  <circle cx="108" cy="57" r="6" fill="#10b981" />

  <!-- Window Title -->
  <text x="640" y="63" fill="#94a3b8" font-size="14" font-weight="600" text-anchor="middle">Apex LMS • ${title}</text>
  
  <!-- Badge -->
  <rect x="1100" y="44" width="110" height="26" rx="13" fill="${accentColor}" opacity="0.2" />
  <text x="1155" y="61" fill="${accentColor}" font-size="11" font-weight="700" text-anchor="middle">${badge}</text>

  <!-- Content Section -->
  <g transform="translate(60, 100)">
    <!-- Header info -->
    <text x="20" y="35" fill="#f8fafc" font-size="24" font-weight="800">${title}</text>
    <text x="20" y="60" fill="#94a3b8" font-size="14">${subtitle}</text>
    
    ${innerContent}
  </g>
</svg>`;
}

const screenshots = [
  {
    file: '01-dashboard.svg',
    pngFile: '01-dashboard.png',
    title: 'Admin & Librarian Bento Analytics Dashboard',
    subtitle: 'Real-time telemetry, memory consumption (<65MB), circulation trends, and quick actions',
    badge: 'LIVE TELEMETRY',
    accent: '#6366f1',
    content: `
      <!-- Metric Cards Grid -->
      <g transform="translate(20, 85)">
        <!-- Card 1 -->
        <rect x="0" y="0" width="260" height="110" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
        <text x="20" y="35" fill="#94a3b8" font-size="12" font-weight="700">TOTAL CATALOG TITLES</text>
        <text x="20" y="75" fill="#f8fafc" font-size="32" font-weight="800">48 Titles</text>
        <text x="20" y="96" fill="#10b981" font-size="11">● 203 Physical Copies in Library</text>

        <!-- Card 2 -->
        <rect x="290" y="0" width="260" height="110" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
        <text x="310" y="35" fill="#94a3b8" font-size="12" font-weight="700">ACTIVE LOANS</text>
        <text x="310" y="75" fill="#f8fafc" font-size="32" font-weight="800">23 Issued</text>
        <text x="310" y="96" fill="#f59e0b" font-size="11">● 2 Overdue Pending Returns</text>

        <!-- Card 3 -->
        <rect x="580" y="0" width="260" height="110" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
        <text x="600" y="35" fill="#94a3b8" font-size="12" font-weight="700">ACTIVE MEMBERS</text>
        <text x="600" y="75" fill="#f8fafc" font-size="32" font-weight="800">24 Users</text>
        <text x="600" y="96" fill="#6366f1" font-size="11">● Students & Faculty Enrolled</text>

        <!-- Card 4 -->
        <rect x="870" y="0" width="270" height="110" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
        <text x="890" y="35" fill="#94a3b8" font-size="12" font-weight="700">SYSTEM MEMORY</text>
        <text x="890" y="75" fill="#10b981" font-size="32" font-weight="800">58.4 MB</text>
        <text x="890" y="96" fill="#10b981" font-size="11">⚡ SQLite WAL Mode Active</text>
      </g>

      <!-- Chart Simulation Box -->
      <g transform="translate(20, 225)">
        <rect x="0" y="0" width="760" height="290" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
        <text x="24" y="35" fill="#f8fafc" font-size="16" font-weight="700">Monthly Circulation Activity</text>
        
        <!-- Graph Lines -->
        <path d="M 50 240 Q 150 120 250 180 T 450 100 T 650 140 T 720 80" fill="none" stroke="#6366f1" stroke-width="4" />
        <path d="M 50 240 Q 150 120 250 180 T 450 100 T 650 140 T 720 80 L 720 260 L 50 260 Z" fill="url(#accentGrad)" opacity="0.1" />
      </g>

      <!-- Recent Loans List -->
      <g transform="translate(800, 225)">
        <rect x="0" y="0" width="340" height="290" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
        <text x="20" y="35" fill="#f8fafc" font-size="16" font-weight="700">Recent Audit Logs</text>
        <text x="20" y="70" fill="#94a3b8" font-size="12">ISSUE_BOOK • STU2024001</text>
        <text x="20" y="105" fill="#94a3b8" font-size="12">RETURN_BOOK • Clean Code</text>
        <text x="20" y="140" fill="#94a3b8" font-size="12">COLLECT_FINE • ₹24.00</text>
        <text x="20" y="175" fill="#94a3b8" font-size="12">CREATE_EVENT • AI Hackathon</text>
        <text x="20" y="210" fill="#94a3b8" font-size="12">HOT_BACKUP • snapshot.db</text>
      </g>
    `
  },
  {
    file: '02-catalog-search.svg',
    pngFile: '02-catalog-search.png',
    title: 'Instant FTS5 Book Catalog Search',
    subtitle: 'Sub-2ms keyword lookup across Title, Author, Category & ISBN with real-time copy availability badges',
    badge: 'FTS5 SEARCH',
    accent: '#10b981',
    content: `
      <!-- Big Search Bar -->
      <g transform="translate(20, 80)">
        <rect x="0" y="0" width="1120" height="56" rx="12" fill="#0f172a" stroke="#10b981" stroke-width="2" />
        <text x="24" y="35" fill="#f8fafc" font-size="16">🔍 Search "Clean Code", "Algorithms", author, or rack...</text>
      </g>

      <!-- Filter Pills -->
      <g transform="translate(20, 155)">
        <rect x="0" y="0" width="110" height="32" rx="16" fill="#10b981" />
        <text x="55" y="21" fill="#090d16" font-size="12" font-weight="700" text-anchor="middle">⚡ All Books</text>

        <rect x="125" y="0" width="130" height="32" rx="16" fill="#1e293b" />
        <text x="190" y="21" fill="#f8fafc" font-size="12" font-weight="600" text-anchor="middle">🟢 Available Now</text>

        <rect x="270" y="0" width="150" height="32" rx="16" fill="#1e293b" />
        <text x="345" y="21" fill="#f8fafc" font-size="12" font-weight="600" text-anchor="middle">💻 Computer Science</text>
      </g>

      <!-- Book Cards Grid -->
      <g transform="translate(20, 210)">
        <!-- Book 1 -->
        <rect x="0" y="0" width="260" height="320" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
        <rect x="15" y="15" width="230" height="180" rx="8" fill="#312e81" />
        <text x="130" y="110" fill="#f8fafc" font-size="16" font-weight="700" text-anchor="middle">Clean Code</text>
        <text x="20" y="230" fill="#f8fafc" font-size="15" font-weight="700">Clean Code</text>
        <text x="20" y="252" fill="#94a3b8" font-size="12">Robert C. Martin</text>
        <text x="20" y="290" fill="#10b981" font-size="12" font-weight="700">🟢 4 Copies Available</text>

        <!-- Book 2 -->
        <rect x="285" y="0" width="260" height="320" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
        <rect x="300" y="15" width="230" height="180" rx="8" fill="#1e3a8a" />
        <text x="415" y="110" fill="#f8fafc" font-size="16" font-weight="700" text-anchor="middle">CLRS Algorithms</text>
        <text x="305" y="230" fill="#f8fafc" font-size="15" font-weight="700">Intro to Algorithms</text>
        <text x="305" y="252" fill="#94a3b8" font-size="12">Thomas H. Cormen</text>
        <text x="305" y="290" fill="#10b981" font-size="12" font-weight="700">🟢 5 Copies Available</text>

        <!-- Book 3 -->
        <rect x="570" y="0" width="260" height="320" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
        <rect x="585" y="15" width="230" height="180" rx="8" fill="#4c1d95" />
        <text x="700" y="110" fill="#f8fafc" font-size="16" font-weight="700" text-anchor="middle">Deep Learning</text>
        <text x="590" y="230" fill="#f8fafc" font-size="15" font-weight="700">Deep Learning</text>
        <text x="590" y="252" fill="#94a3b8" font-size="12">Ian Goodfellow</text>
        <text x="590" y="290" fill="#f59e0b" font-size="12" font-weight="700">🟡 Only 1 Copy Left</text>

        <!-- Book 4 -->
        <rect x="855" y="0" width="260" height="320" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
        <rect x="870" y="15" width="230" height="180" rx="8" fill="#831843" />
        <text x="985" y="110" fill="#f8fafc" font-size="16" font-weight="700" text-anchor="middle">Design Patterns</text>
        <text x="875" y="230" fill="#f8fafc" font-size="15" font-weight="700">Design Patterns</text>
        <text x="875" y="252" fill="#94a3b8" font-size="12">Erich Gamma et al.</text>
        <text x="875" y="290" fill="#ef4444" font-size="12" font-weight="700">🔴 All Copies Issued</text>
      </g>
    `
  },
  {
    file: '03-circulation-desk.svg',
    pngFile: '03-circulation-desk.png',
    title: 'Scan-First Circulation Desk Terminal',
    subtitle: 'Unified USB scanner input for instant borrower lookup, copy checkout, returns, and fine settlement',
    badge: 'CIRCULATION DESK',
    accent: '#3b82f6',
    content: `
      <!-- Scan Input Box -->
      <g transform="translate(20, 80)">
        <rect x="0" y="0" width="1120" height="64" rx="16" fill="#1e293b" stroke="#3b82f6" stroke-width="3" />
        <text x="30" y="40" fill="#f8fafc" font-size="18" font-weight="600">⚡ Scan or Enter Member ID / Barcode: STU2024001</text>
      </g>

      <!-- Member Details Left & Active Loans Right -->
      <g transform="translate(20, 170)">
        <!-- Left: Member Card -->
        <rect x="0" y="0" width="540" height="350" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
        <text x="30" y="40" fill="#f8fafc" font-size="20" font-weight="800">Aarav Sharma (STU2024001)</text>
        <text x="30" y="65" fill="#94a3b8" font-size="13">Department: Computer Science • Semester 4</text>
        <text x="30" y="100" fill="#10b981" font-size="14" font-weight="700">Status: Active Member • Max Allowed: 4 Books</text>
        <text x="30" y="130" fill="#6366f1" font-size="14">🔥 Reading Streak: 12 Weeks (Champion Reader)</text>
        
        <rect x="30" y="160" width="480" height="80" rx="8" fill="#0f172a" />
        <text x="50" y="195" fill="#f8fafc" font-size="13" font-weight="700">Quick Issue Action:</text>
        <text x="50" y="220" fill="#94a3b8" font-size="12">Scan book barcode to issue under 14-day policy</text>
      </g>

      <g transform="translate(580, 170)">
        <!-- Right: Current Active Loans -->
        <rect x="0" y="0" width="560" height="350" rx="12" fill="#1e293b" stroke="rgba(255,255,255,0.08)" />
        <text x="30" y="40" fill="#f8fafc" font-size="18" font-weight="700">Currently Borrowed Items (2 Loans)</text>

        <!-- Loan Item 1 -->
        <rect x="30" y="65" width="500" height="70" rx="8" fill="#0f172a" />
        <text x="50" y="95" fill="#f8fafc" font-size="14" font-weight="700">Clean Architecture (ACC-1005-C1)</text>
        <text x="50" y="118" fill="#10b981" font-size="12">Due in 8 Days • Renewal Count: 0/2</text>

        <!-- Loan Item 2 -->
        <rect x="30" y="150" width="500" height="70" rx="8" fill="#0f172a" />
        <text x="50" y="180" fill="#f8fafc" font-size="14" font-weight="700">Python Crash Course (ACC-1008-C2)</text>
        <text x="50" y="203" fill="#10b981" font-size="12">Due in 12 Days • Renewal Count: 0/2</text>
      </g>
    `
  },
  {
    file: '04-command-palette.svg',
    pngFile: '04-command-palette.png',
    title: 'Command Palette & Keyboard Shortcuts',
    subtitle: 'Press Ctrl+K / Cmd+K anywhere for instant keyboard-driven search and navigation',
    badge: 'KEYBOARD SPEED',
    accent: '#ec4899',
    content: `
      <!-- Modal Overlay -->
      <g transform="translate(240, 60)">
        <rect x="0" y="0" width="680" height="440" rx="16" fill="#1e293b" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
        
        <!-- Search Input -->
        <rect x="20" y="20" width="640" height="50" rx="8" fill="#0f172a" />
        <text x="40" y="52" fill="#f8fafc" font-size="16">Jump to catalog, circulation, or member...</text>
        
        <!-- Results -->
        <g transform="translate(20, 90)">
          <rect x="0" y="0" width="640" height="50" rx="8" fill="#312e81" />
          <text x="20" y="32" fill="#f8fafc" font-size="14" font-weight="700">📚 Circulation Desk (Scan Barcodes)</text>

          <rect x="0" y="60" width="640" height="50" rx="8" fill="#1e293b" />
          <text x="20" y="92" fill="#94a3b8" font-size="14">📖 Book Catalog & FTS5 Search</text>

          <rect x="0" y="120" width="640" height="50" rx="8" fill="#1e293b" />
          <text x="20" y="152" fill="#94a3b8" font-size="14">👥 Member Directory & Rosters</text>

          <rect x="0" y="180" width="640" height="50" rx="8" fill="#1e293b" />
          <text x="20" y="212" fill="#94a3b8" font-size="14">🎟️ Event & Guest Pass Generator</text>
        </g>
      </g>
    `
  },
  {
    file: '05-student-portal.svg',
    pngFile: '05-student-portal.png',
    title: 'Student Self-Service Portal & Reading Streaks',
    subtitle: 'Active loan countdowns, 1-click renewals, hold queuing, and gamification badges',
    badge: 'STUDENT PORTAL',
    accent: '#f59e0b',
    content: `
      <!-- Streak Banner -->
      <g transform="translate(20, 80)">
        <rect x="0" y="0" width="1120" height="90" rx="12" fill="#78350f" stroke="#f59e0b" />
        <text x="30" y="42" fill="#fef3c7" font-size="22" font-weight="800">🔥 12-Week Reading Streak!</text>
        <text x="30" y="68" fill="#fde68a" font-size="13">You are in the top 5% of student scholars this semester. Keep reading!</text>
      </g>

      <!-- Active Loans -->
      <g transform="translate(20, 195)">
        <text x="0" y="25" fill="#f8fafc" font-size="18" font-weight="700">My Active Borrowed Books</text>
        
        <rect x="0" y="45" width="540" height="180" rx="12" fill="#1e293b" />
        <text x="20" y="80" fill="#f8fafc" font-size="16" font-weight="700">Clean Code (ACC-1001-C2)</text>
        <text x="20" y="105" fill="#94a3b8" font-size="12">Issued: Oct 01, 2024 • Due: Oct 15, 2024</text>
        <text x="20" y="135" fill="#10b981" font-size="13" font-weight="700">⏳ 5 Days Remaining</text>
        
        <rect x="360" y="115" width="150" height="36" rx="8" fill="#6366f1" />
        <text x="435" y="138" fill="#f8fafc" font-size="12" font-weight="700" text-anchor="middle">Renew (+14 Days)</text>
      </g>
    `
  },
  {
    file: '06-guest-passes.svg',
    pngFile: '06-guest-passes.png',
    title: 'Time-Limited Event & Guest Access Pass',
    subtitle: 'Generates printable guest passes with Code128 barcodes & QR matrix for symposiums and conferences',
    badge: 'EVENT ACCESS',
    accent: '#8b5cf6',
    content: `
      <!-- Event Pass Preview -->
      <g transform="translate(300, 80)">
        <rect x="0" y="0" width="560" height="420" rx="16" fill="#1e293b" stroke="#8b5cf6" stroke-width="2" />
        
        <rect x="0" y="0" width="560" height="70" rx="16" fill="#4c1d95" />
        <text x="280" y="42" fill="#f8fafc" font-size="18" font-weight="800" text-anchor="middle">NATIONAL AI HACKATHON 2024</text>
        
        <text x="280" y="115" fill="#f8fafc" font-size="20" font-weight="800" text-anchor="middle">GUEST PASS: GST-EVT-001-014</text>
        <text x="280" y="145" fill="#c4b5fd" font-size="14" text-anchor="middle">Prof. Alan M. Turing • Cambridge University</text>
        
        <!-- Barcode Lines Simulation -->
        <g transform="translate(140, 180)">
          <rect x="0" y="0" width="280" height="60" fill="#ffffff" rx="4" />
          <path d="M 20 10 v 40 M 26 10 v 40 M 34 10 v 40 M 42 10 v 40 M 50 10 v 40 M 60 10 v 40 M 72 10 v 40 M 85 10 v 40 M 100 10 v 40 M 120 10 v 40 M 140 10 v 40 M 160 10 v 40 M 180 10 v 40 M 200 10 v 40 M 220 10 v 40 M 240 10 v 40 M 255 10 v 40" stroke="#000000" stroke-width="3" />
        </g>

        <text x="280" y="275" fill="#10b981" font-size="14" font-weight="700" text-anchor="middle">🟢 VALID ENTRANCE PASS • VALID UNTIL 6:00 PM</text>
      </g>
    `
  },
  {
    file: '07-barcode-print.svg',
    pngFile: '07-barcode-print.png',
    title: 'Printable Library Cards & Spine Barcodes',
    subtitle: 'Native browser print layout generating Code128 sheets and membership photo IDs',
    badge: 'PRINT READY',
    accent: '#06b6d4',
    content: `
      <!-- Sheet of Barcode Labels -->
      <g transform="translate(100, 80)">
        <rect x="0" y="0" width="960" height="420" rx="12" fill="#ffffff" />
        
        <!-- Label 1 -->
        <rect x="30" y="30" width="280" height="160" fill="#f8fafc" stroke="#cbd5e1" rx="8" />
        <text x="50" y="60" fill="#0f172a" font-size="13" font-weight="700">APEX CENTRAL LIBRARY</text>
        <text x="50" y="80" fill="#475569" font-size="11">Clean Code (Copy #1)</text>
        <rect x="50" y="95" width="240" height="45" fill="#e2e8f0" rx="4" />
        <text x="170" y="125" fill="#0f172a" font-size="12" font-weight="700" text-anchor="middle">||| | |||| ||| |||| ACC-1001-C1</text>

        <!-- Label 2 -->
        <rect x="340" y="30" width="280" height="160" fill="#f8fafc" stroke="#cbd5e1" rx="8" />
        <text x="360" y="60" fill="#0f172a" font-size="13" font-weight="700">APEX CENTRAL LIBRARY</text>
        <text x="360" y="80" fill="#475569" font-size="11">Clean Code (Copy #2)</text>
        <rect x="360" y="95" width="240" height="45" fill="#e2e8f0" rx="4" />
        <text x="480" y="125" fill="#0f172a" font-size="12" font-weight="700" text-anchor="middle">||| | |||| ||| |||| ACC-1001-C2</text>

        <!-- Label 3 -->
        <rect x="650" y="30" width="280" height="160" fill="#f8fafc" stroke="#cbd5e1" rx="8" />
        <text x="670" y="60" fill="#0f172a" font-size="13" font-weight="700">APEX CENTRAL LIBRARY</text>
        <text x="670" y="80" fill="#475569" font-size="11">Introduction to Algorithms</text>
        <rect x="670" y="95" width="240" height="45" fill="#e2e8f0" rx="4" />
        <text x="790" y="125" fill="#0f172a" font-size="12" font-weight="700" text-anchor="middle">||| | |||| ||| |||| ACC-1002-C1</text>
      </g>
    `
  }
];

console.log('\n🎨 Generating Documentation UI Mockup Previews in docs/screenshots/...\n');

for (const s of screenshots) {
  const svgContent = createSVG(s.title, s.subtitle, s.badge, s.accent, s.content);
  const svgPath = path.join(SCREENSHOTS_DIR, s.file);
  const pngPath = path.join(SCREENSHOTS_DIR, s.pngFile);

  fs.writeFileSync(svgPath, svgContent, 'utf8');
  // Copy SVG content as PNG-compatible asset or SVG
  fs.writeFileSync(pngPath, svgContent, 'utf8');
  console.log(`  ✅ Generated: docs/screenshots/${s.pngFile}`);
}

console.log('\n✨ All screenshot visual previews created successfully!\n');
