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
      <g transform="translate(24, ${height * 0.60})">
        <text x="0" y="0" fill="#ffffff" font-family="system-ui, sans-serif" font-size="18" font-weight="800" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
          <tspan x="0" dy="0">${line1}</tspan>
          ${line2 ? `<tspan x="0" dy="22">${line2}</tspan>` : ''}
          ${line3 ? `<tspan x="0" dy="22">${line3}</tspan>` : ''}
        </text>
      </g>

      <!-- Author -->
      <text x="24" y="${height - 24}" fill="rgba(255,255,255,0.85)" font-family="system-ui, sans-serif" font-size="12" font-weight="600">${shortAuthor}</text>
    </svg>
  `;
}

// Map of known book titles to real downloaded high-res photos
const BOOK_IMAGE_MAP = {
  // Computer Science & Programming
  'clean code': '/images/books/clean-code.jpg',
  'pragmatic programmer': '/images/books/pragmatic-programmer.jpg',
  'algorithms': '/images/books/algorithms-clrs.jpg',
  'data-intensive': '/images/books/ddia.jpg',
  'c programming': '/images/books/c-programming.jpg',
  'operating system': '/images/books/operating-systems.jpg',
  'database': '/images/books/database-systems.jpg',
  'networks': '/images/books/computer-networks.jpg',
  'domain-driven': '/images/books/domain-driven-design.jpg',
  'sicp': '/images/books/sicp.jpg',
  'structure and interpretation': '/images/books/sicp.jpg',
  'cracking the coding': '/images/books/cracking-coding-interview.jpg',
  'microservices': '/images/books/building-microservices.jpg',
  'python': '/images/books/python-crash-course.jpg',
  'clean architecture': '/images/books/clean-architecture.jpg',

  // AI & Data Science
  'artificial intelligence': '/images/books/ai-modern-approach.jpg',
  'deep learning': '/images/books/deep-learning-goodfellow.jpg',
  'machine learning': '/images/books/hands-on-ml.jpg',
  'pattern recognition': '/images/books/pattern-recognition.jpg',
  'data analysis': '/images/books/python-data-analysis.jpg',
  'machine learning systems': '/images/books/designing-ml-systems.jpg',

  // Electronics & Hardware
  'digital design': '/images/books/digital-design.jpg',
  'microelectronic': '/images/books/microelectronic-circuits.jpg',
  'signals': '/images/books/signals-systems.jpg',
  'electronic devices': '/images/books/electronic-devices.jpg',
  'fpga': '/images/books/fpga-prototyping.jpg',

  // Mechanical & Civil
  'thermodynamics': '/images/books/thermodynamics.jpg',
  'theory of machines': '/images/books/theory-of-machines.jpg',
  'fluid mechanics': '/images/books/fluid-mechanics.jpg',
  'strength of materials': '/images/books/strength-of-materials.jpg',
  'steel structures': '/images/books/steel-structures.jpg',

  // Mathematics & Physics
  'advanced engineering mathematics': '/images/books/advanced-eng-math.jpg',
  'higher engineering mathematics': '/images/books/higher-eng-math.jpg',
  'linear algebra': '/images/books/linear-algebra.jpg',
  'discrete mathematics': '/images/books/discrete-math.jpg',
  'quantum mechanics': '/images/books/quantum-mechanics.jpg',
  'cosmos': '/images/books/cosmos-sagan.jpg',
  'brief history of time': '/images/books/brief-history-time.jpg',

  // Management & Business
  'lean startup': '/images/books/lean-startup.jpg',
  'zero to one': '/images/books/zero-to-one.jpg',
  'good to great': '/images/books/good-to-great.jpg',
  'marketing management': '/images/books/marketing-management.jpg',

  // Self Improvement & General
  'atomic habits': '/images/books/atomic-habits.jpg',
  'deep work': '/images/books/deep-work.jpg',
  'psychology of money': '/images/books/psychology-of-money.jpg',
  'wings of fire': '/images/books/wings-of-fire.jpg',
  'sapiens': '/images/books/sapiens.jpg',
  'thinking, fast': '/images/books/thinking-fast-slow.jpg',

  // Literature
  'godan': '/images/books/godan.jpg',
  'gujarat no nath': '/images/books/gujarat-no-nath.jpg',
  'saraswatichandra': '/images/books/saraswatichandra.jpg',
  'madhushala': '/images/books/madhushala.jpg'
};

const CATEGORY_IMAGE_MAP = {
  'computer science': '/images/books/clean-code.jpg',
  'artificial intelligence': '/images/books/deep-learning-goodfellow.jpg',
  'data': '/images/books/hands-on-ml.jpg',
  'electronics': '/images/books/digital-design.jpg',
  'mechanical': '/images/books/thermodynamics.jpg',
  'civil': '/images/books/steel-structures.jpg',
  'mathematics': '/images/books/higher-eng-math.jpg',
  'physics': '/images/books/quantum-mechanics.jpg',
  'management': '/images/books/lean-startup.jpg',
  'business': '/images/books/good-to-great.jpg',
  'self improvement': '/images/books/atomic-habits.jpg',
  'career': '/images/books/deep-work.jpg',
  'literature': '/images/books/sapiens.jpg'
};

// Render photography cover or procedural SVG
function getBookCoverHTML(title, author, category = '', width = 300, height = 400) {
  const lowerTitle = (title || '').toLowerCase();
  const lowerCat = (category || '').toLowerCase();
  
  let chosenImg = null;

  // 1. Direct title keyword match
  for (const [key, imgPath] of Object.entries(BOOK_IMAGE_MAP)) {
    if (lowerTitle.includes(key)) {
      chosenImg = imgPath;
      break;
    }
  }

  // 2. Category photo match
  if (!chosenImg) {
    for (const [catKey, imgPath] of Object.entries(CATEGORY_IMAGE_MAP)) {
      if (lowerCat.includes(catKey) || lowerTitle.includes(catKey)) {
        chosenImg = imgPath;
        break;
      }
    }
  }

  // 3. Ultimate default photo fallback
  if (!chosenImg) {
    chosenImg = '/images/books/algorithms-clrs.jpg';
  }

  const shortCategory = category ? (category.length > 20 ? category.substring(0, 18) + '...' : category).toUpperCase() : 'LIBRARY';

  return `
    <div class="book-cover-photo-wrap" style="position:relative; width:100%; height:100%; border-radius:12px; overflow:hidden; background:#0f172a; box-shadow:0 8px 20px rgba(0,0,0,0.4);">
      <img src="${chosenImg}" alt="${title} cover" style="width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.3s ease;" loading="lazy" />
      
      <!-- Top Dark Vignette -->
      <div style="position:absolute; top:0; left:0; right:0; height:60px; background:linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%); pointer-events:none;"></div>
      
      <!-- Bottom Dark Gradient for Title Legibility -->
      <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.5) 55%, rgba(15,23,42,0.92) 100%); pointer-events:none;"></div>
      
      <!-- Spine Shadow Left -->
      <div style="position:absolute; top:0; left:0; bottom:0; width:12px; background:linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 100%); pointer-events:none;"></div>

      <!-- Top Category Badge Pill -->
      <div style="position:absolute; top:12px; left:12px; background:rgba(15,23,42,0.75); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.15); padding:3px 8px; border-radius:10px; font-size:0.65rem; font-weight:700; color:#e2e8f0; letter-spacing:0.5px; pointer-events:none;">
        ${shortCategory}
      </div>

      <!-- Bottom Title & Author Text -->
      <div style="position:absolute; bottom:12px; left:14px; right:14px; color:#ffffff; pointer-events:none;">
        <div style="font-size:0.9rem; font-weight:800; line-height:1.25; text-shadow:0 2px 6px rgba(0,0,0,0.9); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${title}</div>
        <div style="font-size:0.75rem; opacity:0.85; margin-top:3px; text-shadow:0 1px 4px rgba(0,0,0,0.8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">by ${author}</div>
      </div>
    </div>
  `;
}

// Global Exports
window.generateBookCoverSVG = generateBookCoverSVG;
window.getBookCoverHTML = getBookCoverHTML;

