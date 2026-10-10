// Procedural Deterministic Book Cover Generator (Pure SVG & Canvas - 100% Offline)

const COVER_GRADIENTS = [
  ['#4f46e5', '#7c3aed', '#ec4899'], // Indigo to Violet to Pink
  ['#0ea5e9', '#2563eb', '#1d4ed8'], // Cyan to Deep Blue
  ['#059669', '#10b981', '#06b6d4'], // Emerald to Mint to Cyan
  ['#e11d48', '#f43f5e', '#fb923c'], // Crimson to Rose to Orange
  ['#d97706', '#f59e0b', '#ef4444'], // Amber to Gold to Red
  ['#7c2d12', '#9a3412', '#c2410c'], // Rust to Sienna
  ['#581c87', '#7e22ce', '#3b82f6'], // Deep Purple to Neon Blue
  ['#0f172a', '#334155', '#475569']  // Slate Minimalist
];

// String hash helper
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Generate initials (e.g. "Clean Code" -> "CC", "Artificial Intelligence" -> "AI")
function getInitials(title) {
  const clean = title.replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase();
}

// Generate inline SVG book cover
function generateBookCoverSVG(title, author, category = '', width = 300, height = 400) {
  const hash = hashCode(title + (author || ''));
  const palette = COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
  const initials = getInitials(title);
  const patternType = hash % 4; // 0: circles, 1: grid dots, 2: diagonal waves, 3: minimalist geometric

  const gradId = `covGrad_${hash}`;

  let patternSvg = '';
  if (patternType === 0) {
    patternSvg = `
      <circle cx="${width * 0.85}" cy="${height * 0.2}" r="${width * 0.4}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="40" />
      <circle cx="${width * 0.15}" cy="${height * 0.85}" r="${width * 0.3}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="20" />
    `;
  } else if (patternType === 1) {
    patternSvg = `
      <defs>
        <pattern id="dotPattern_${hash}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="rgba(255,255,255,0.15)" />
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#dotPattern_${hash})" />
    `;
  } else if (patternType === 2) {
    patternSvg = `
      <path d="M-50,${height * 0.3} Q${width * 0.5},${height * 0.1} ${width + 50},${height * 0.4} L${width + 50},${height} L-50,${height} Z" fill="rgba(255,255,255,0.06)" />
      <path d="M-50,${height * 0.6} Q${width * 0.5},${height * 0.4} ${width + 50},${height * 0.7} L${width + 50},${height} L-50,${height} Z" fill="rgba(255,255,255,0.08)" />
    `;
  } else {
    patternSvg = `
      <polygon points="0,0 ${width},${height * 0.4} 0,${height * 0.7}" fill="rgba(255,255,255,0.06)" />
      <polygon points="${width},${height * 0.3} 0,${height} ${width},${height}" fill="rgba(0,0,0,0.15)" />
    `;
  }

  // Format title lines
  const titleWords = title.split(' ');
  let line1 = '';
  let line2 = '';
  let line3 = '';

  for (const w of titleWords) {
    if ((line1 + ' ' + w).length <= 16) {
      line1 += (line1 ? ' ' : '') + w;
    } else if ((line2 + ' ' + w).length <= 16) {
      line2 += (line2 ? ' ' : '') + w;
    } else if ((line3 + ' ' + w).length <= 16) {
      line3 += (line3 ? ' ' : '') + w;
    }
  }

  const shortCat = category ? (category.length > 22 ? category.substring(0, 20) + '...' : category).toUpperCase() : 'ACADEMIC';
  const shortAuthor = author ? (author.length > 26 ? author.substring(0, 24) + '...' : author) : 'College Press';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" class="procedural-cover-svg" style="border-radius:12px; display:block; overflow:hidden; user-select:none;">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette[0]}" />
          <stop offset="50%" stop-color="${palette[1]}" />
          <stop offset="100%" stop-color="${palette[2] || palette[1]}" />
        </linearGradient>
      </defs>

      <!-- Base Gradient Background -->
      <rect width="${width}" height="${height}" fill="url(#${gradId})" />

      <!-- Geometric Pattern Overlay -->
      ${patternSvg}

      <!-- Spine Accent Line -->
      <rect x="0" y="0" width="10" height="${height}" fill="rgba(0,0,0,0.25)" />
      <line x1="10" y1="0" x2="10" y2="${height}" stroke="rgba(255,255,255,0.15)" stroke-width="1" />

      <!-- Top Category Pill Tag -->
      <g transform="translate(24, 28)">
        <rect x="0" y="0" width="${Math.min(180, shortCat.length * 8 + 18)}" height="22" rx="11" fill="rgba(0,0,0,0.3)" />
        <text x="9" y="15" fill="#ffffff" font-family="system-ui, sans-serif" font-size="9" font-weight="700" letter-spacing="1">${shortCat}</text>
      </g>

      <!-- Center Big Initials Monogram -->
      <text x="${width / 2}" y="${height * 0.46}" text-anchor="middle" fill="rgba(255,255,255,0.18)" font-family="system-ui, sans-serif" font-size="${width * 0.3}" font-weight="900" letter-spacing="2">${initials}</text>

      <!-- Book Title -->
      <g transform="translate(24, ${height * 0.58})">
        <text x="0" y="0" fill="#ffffff" font-family="system-ui, sans-serif" font-size="18" font-weight="800" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
          <tspan x="0" dy="0">${line1}</tspan>
          ${line2 ? `<tspan x="0" dy="22">${line2}</tspan>` : ''}
          ${line3 ? `<tspan x="0" dy="22">${line3}</tspan>` : ''}
        </text>
      </g>

      <!-- Bottom Author & College Emblem -->
      <g transform="translate(24, ${height - 24})">
        <text x="0" y="0" fill="rgba(255,255,255,0.85)" font-family="system-ui, sans-serif" font-size="12" font-weight="600" letter-spacing="0.5">${shortAuthor}</text>
      </g>
    </svg>
  `.trim();
}
