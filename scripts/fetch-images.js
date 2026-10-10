/**
 * Apex LMS - One-Time Stock Photo Fetcher (Unsplash & Pexels APIs)
 * 
 * Downloads high-quality, web-optimized landscape stock photos for:
 * - Hero backgrounds
 * - Event banner cards
 * - Empty-state illustrations
 * - Library & campus background textures
 * 
 * Generates public/images/images.json with full attribution for offline use.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Simple .env parser to avoid third-party dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...vals] = trimmed.split('=');
        const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
}

loadEnv();

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const PEXELS_KEY = process.env.PEXELS_API_KEY || '';

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const MANIFEST_PATH = path.join(IMAGES_DIR, 'images.json');

// Search categories, target subfolders, and query assignments
const CATEGORY_MAPPINGS = [
  { query: 'library interior', folder: 'hero', prefix: 'hero-library', label: 'Library Interior' },
  { query: 'dark moody library', folder: 'hero', prefix: 'hero-dark-library', label: 'Moody Classical Library' },
  { query: 'students studying', folder: 'backgrounds', prefix: 'bg-students-study', label: 'Students Studying' },
  { query: 'college campus', folder: 'backgrounds', prefix: 'bg-college-campus', label: 'College Campus' },
  { query: 'bookshelf', folder: 'backgrounds', prefix: 'bg-bookshelf', label: 'Organized Bookshelves' },
  { query: 'workshop seminar', folder: 'events', prefix: 'event-workshop', label: 'Academic Workshop & Seminar' },
  { query: 'reading', folder: 'empty-states', prefix: 'empty-reading', label: 'Peaceful Reading' },
  { query: 'books aesthetic', folder: 'empty-states', prefix: 'empty-books-aesthetic', label: 'Aesthetic Book Stacks' }
];

// Curated fallback photo collection (Direct Unsplash & Pexels image endpoints)
// Used when API keys are omitted or rate-limited, guaranteeing 100% offline asset availability
const CURATED_FALLBACK_PHOTOS = [
  // Hero: Library Interior
  {
    category: 'hero',
    filename: 'hero-library-1.jpg',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1600&auto=format&fit=crop&q=80',
    title: 'Historic Grand Library Hall',
    photographer: 'Giammarco Boscaro',
    photographer_url: 'https://unsplash.com/@giammarco',
    source_url: 'https://unsplash.com/photos/1521587760476-6c12a4b040da',
    api: 'Unsplash',
    alt: 'Grand historic library with multiple tiers of wooden bookshelves and reading tables'
  },
  {
    category: 'hero',
    filename: 'hero-library-2.jpg',
    url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&auto=format&fit=crop&q=80',
    title: 'Modern University Study Space',
    photographer: 'Susan Q Yin',
    photographer_url: 'https://unsplash.com/@natural_photos',
    source_url: 'https://unsplash.com/photos/1541339907198-e08756dedf3f',
    api: 'Unsplash',
    alt: 'Spacious modern college library interior with sunlight illuminating study desks'
  },
  {
    category: 'hero',
    filename: 'hero-dark-library-1.jpg',
    url: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=1600&auto=format&fit=crop&q=80',
    title: 'Atmospheric Classical Library Rows',
    photographer: 'Mick Haupt',
    photographer_url: 'https://unsplash.com/@rocinante_11',
    source_url: 'https://unsplash.com/photos/1568667256549-094345857637',
    api: 'Unsplash',
    alt: 'Warm atmospheric lighting in a quiet library aisle flanked by dense book stacks'
  },
  {
    category: 'hero',
    filename: 'hero-dark-library-2.jpg',
    url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1600&auto=format&fit=crop&q=80',
    title: 'Classic Book Vault Reading Corner',
    photographer: 'Priscilla Du Preez',
    photographer_url: 'https://unsplash.com/@priscilladupreez',
    source_url: 'https://unsplash.com/photos/1481627834876-b7833e8f5570',
    api: 'Unsplash',
    alt: 'Open hardcover book in a rustic library setting with vintage shelf background'
  },

  // Backgrounds: Students & Campus & Bookshelves
  {
    category: 'backgrounds',
    filename: 'bg-students-study-1.jpg',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1600&auto=format&fit=crop&q=80',
    title: 'Collegiate Collaborative Study Group',
    photographer: 'Alexis Brown',
    photographer_url: 'https://unsplash.com/@alexisrbrown',
    source_url: 'https://unsplash.com/photos/1523240795612-9a054b0db644',
    api: 'Unsplash',
    alt: 'Group of diverse university students working together with notebooks and laptops in library'
  },
  {
    category: 'backgrounds',
    filename: 'bg-college-campus-1.jpg',
    url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1600&auto=format&fit=crop&q=80',
    title: 'University Campus Quadrangle',
    photographer: 'Vasily Kolotusha',
    photographer_url: 'https://unsplash.com/@vkolotusha',
    source_url: 'https://unsplash.com/photos/1562774053-701939374585',
    api: 'Unsplash',
    alt: 'Historic university brick building and lush green campus courtyard'
  },
  {
    category: 'backgrounds',
    filename: 'bg-bookshelf-1.jpg',
    url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1600&auto=format&fit=crop&q=80',
    title: 'Dense Library Shelves with Hardcover Volumes',
    photographer: 'Alfons Morales',
    photographer_url: 'https://unsplash.com/@alfonsmc97',
    source_url: 'https://unsplash.com/photos/1524995997946-a1c2e315a42f',
    api: 'Unsplash',
    alt: 'Rows of colorful textbooks and reference volumes arranged neatly on library shelf'
  },
  {
    category: 'backgrounds',
    filename: 'bg-bookshelf-2.jpg',
    url: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=1600&auto=format&fit=crop&q=80',
    title: 'Quiet Study Table Near Bookshelves',
    photographer: 'Aline Viana Prado',
    photographer_url: 'https://unsplash.com/@alinevianaprado',
    source_url: 'https://unsplash.com/photos/1506880018603-83d5b814b5a6',
    api: 'Unsplash',
    alt: 'Serene reading table positioned beside wooden bookshelves filled with books'
  },

  // Events: Workshops & Symposiums
  {
    category: 'events',
    filename: 'event-workshop-1.jpg',
    url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1600&auto=format&fit=crop&q=80',
    title: 'Academic Seminar & Guest Lecture',
    photographer: 'Product School',
    photographer_url: 'https://unsplash.com/@productschool',
    source_url: 'https://unsplash.com/photos/1515187029135-18ee286d815b',
    api: 'Unsplash',
    alt: 'Audience listening attentively during an interactive academic workshop and presentation'
  },
  {
    category: 'events',
    filename: 'event-workshop-2.jpg',
    url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1600&auto=format&fit=crop&q=80',
    title: 'Collegiate Hackathon & Group Workshop',
    photographer: 'Priscilla Du Preez',
    photographer_url: 'https://unsplash.com/@priscilladupreez',
    source_url: 'https://unsplash.com/photos/1528605248644-14dd04022da1',
    api: 'Unsplash',
    alt: 'Students collaborating actively around a library conference table with laptops'
  },
  {
    category: 'events',
    filename: 'event-workshop-3.jpg',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&auto=format&fit=crop&q=80',
    title: 'Campus Technology Symposium',
    photographer: 'Alexandre Pellaes',
    photographer_url: 'https://unsplash.com/@pellaes',
    source_url: 'https://unsplash.com/photos/1540575467063-178a50c2df87',
    api: 'Unsplash',
    alt: 'Conference hall auditorium illuminated with presentation screens during symposium'
  },

  // Empty-States: Reading & Books Aesthetic
  {
    category: 'empty-states',
    filename: 'empty-reading-1.jpg',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1600&auto=format&fit=crop&q=80',
    title: 'Stack of Classic Hardcover Books',
    photographer: 'Kimberly Farmer',
    photographer_url: 'https://unsplash.com/@the_modern_life_mrs',
    source_url: 'https://unsplash.com/photos/1497633762265-9d179a990aa6',
    api: 'Unsplash',
    alt: 'Tidy stack of colorful books with chalkboard background for empty states'
  },
  {
    category: 'empty-states',
    filename: 'empty-books-aesthetic-1.jpg',
    url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1600&auto=format&fit=crop&q=80',
    title: 'Peaceful Reading Notebook & Desk',
    photographer: 'Aaron Burden',
    photographer_url: 'https://unsplash.com/@aaronburden',
    source_url: 'https://unsplash.com/photos/1456513080510-7bf3a84b82f8',
    api: 'Unsplash',
    alt: 'Open book resting on a wooden study table beside eyeglasses and a pen'
  },
  {
    category: 'empty-states',
    filename: 'empty-reading-2.jpg',
    url: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=1600&auto=format&fit=crop&q=80',
    title: 'Aesthetic Open Book Pages',
    photographer: 'Eliott Reyna',
    photographer_url: 'https://unsplash.com/@eliottreyna',
    source_url: 'https://unsplash.com/photos/1476275466078-4007374efbbe',
    api: 'Unsplash',
    alt: 'Warm close up of open book pages with soft bokeh lighting'
  }
];

// Helper: Ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper: Sleep to respect rate limits
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Download image from URL and save to destination path
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, { headers: { 'User-Agent': 'Apex-LMS-Asset-Fetcher/1.0' } }, response => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadImage(response.headers.location, destPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download image (HTTP ${response.statusCode})`));
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => resolve());
      });

      fileStream.on('error', err => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    request.on('error', err => {
      fs.unlink(destPath, () => {});
      reject(err);
    });

    request.setTimeout(15000, () => {
      request.destroy();
      reject(new Error('Image download timed out'));
    });
  });
}

// Fetch photos from Unsplash API
async function fetchUnsplash(query, count = 4) {
  if (!UNSPLASH_KEY) return [];
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=${count}`;
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Client-ID ${UNSPLASH_KEY}` }
    });
    if (!res.ok) throw new Error(`Unsplash API HTTP ${res.status}`);
    const data = await res.json();
    return (data.results || []).map(p => ({
      url: `${p.urls.raw}&w=1600&auto=format&fit=crop&q=80`,
      title: p.description || p.alt_description || query,
      photographer: p.user.name || 'Unsplash Contributor',
      photographer_url: `${p.user.links.html}?utm_source=apex_lms&utm_medium=referral`,
      source_url: `${p.links.html}?utm_source=apex_lms&utm_medium=referral`,
      api: 'Unsplash',
      alt: p.alt_description || p.description || query
    }));
  } catch (err) {
    console.warn(`  ⚠️ Unsplash fetch failed for "${query}":`, err.message);
    return [];
  }
}

// Fetch photos from Pexels API
async function fetchPexels(query, count = 4) {
  if (!PEXELS_KEY) return [];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=${count}`;
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': PEXELS_KEY }
    });
    if (!res.ok) throw new Error(`Pexels API HTTP ${res.status}`);
    const data = await res.json();
    return (data.photos || []).map(p => ({
      url: `${p.src.original}?auto=compress&cs=tinysrgb&w=1600`,
      title: p.alt || query,
      photographer: p.photographer || 'Pexels Contributor',
      photographer_url: p.photographer_url,
      source_url: p.url,
      api: 'Pexels',
      alt: p.alt || query
    }));
  } catch (err) {
    console.warn(`  ⚠️ Pexels fetch failed for "${query}":`, err.message);
    return [];
  }
}

// Master execution runner
async function main() {
  console.log('\n=============================================================');
  console.log(' 🖼️  APEX LMS - ONE-TIME STOCK PHOTO ASSET FETCHER');
  console.log('=============================================================');

  ensureDir(path.join(IMAGES_DIR, 'hero'));
  ensureDir(path.join(IMAGES_DIR, 'events'));
  ensureDir(path.join(IMAGES_DIR, 'empty-states'));
  ensureDir(path.join(IMAGES_DIR, 'backgrounds'));

  let existingManifest = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (e) {
      existingManifest = [];
    }
  }

  const manifestMap = new Map();
  existingManifest.forEach(item => manifestMap.set(item.filename, item));

  const hasApiKeys = Boolean(UNSPLASH_KEY || PEXELS_KEY);
  if (hasApiKeys) {
    console.log(' 🔑 API Keys Detected:');
    if (UNSPLASH_KEY) console.log('    • Unsplash Access Key: Configured');
    if (PEXELS_KEY) console.log('    • Pexels API Key:      Configured');
  } else {
    console.log(' ℹ️  No API keys found in .env (UNSPLASH_ACCESS_KEY / PEXELS_API_KEY).');
    console.log('    Using curated high-resolution photo repository with full attribution.\n');
  }

  let totalDownloaded = 0;
  let totalSkipped = 0;

  // If API keys provided, query live APIs
  if (hasApiKeys) {
    for (const mapping of CATEGORY_MAPPINGS) {
      console.log(`\n🔍 Searching: "${mapping.query}" (Target: public/images/${mapping.folder}/)`);
      
      let photos = [];
      const unsplashPhotos = await fetchUnsplash(mapping.query, 4);
      await sleep(350);
      const pexelsPhotos = await fetchPexels(mapping.query, 4);
      await sleep(350);

      // Interleave results
      const maxLen = Math.max(unsplashPhotos.length, pexelsPhotos.length);
      for (let i = 0; i < maxLen; i++) {
        if (unsplashPhotos[i]) photos.push(unsplashPhotos[i]);
        if (pexelsPhotos[i]) photos.push(pexelsPhotos[i]);
      }

      // If both APIs failed for this query, pull from fallback pool
      if (photos.length === 0) {
        console.log(`    ⚠️ Live search empty, falling back to curated pool for "${mapping.query}"`);
        photos = CURATED_FALLBACK_PHOTOS.filter(p => p.category === mapping.folder);
      }

      let idx = 1;
      for (const photo of photos.slice(0, 8)) {
        const ext = 'jpg';
        const filename = `${mapping.prefix}-${idx}.${ext}`;
        const destPath = path.join(IMAGES_DIR, mapping.folder, filename);
        const relativeWebPath = `/images/${mapping.folder}/${filename}`;

        if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
          console.log(`    ⏭️  [Cached] ${mapping.folder}/${filename}`);
          totalSkipped++;
        } else {
          try {
            console.log(`    ⬇️  Downloading ${mapping.folder}/${filename} (${photo.api} by ${photo.photographer})...`);
            await downloadImage(photo.url, destPath);
            const sizeKb = (fs.statSync(destPath).size / 1024).toFixed(1);
            console.log(`       ✅ Saved (${sizeKb} KB)`);
            totalDownloaded++;
            await sleep(350); // Respect rate limits
          } catch (err) {
            console.error(`       ❌ Failed to download ${filename}:`, err.message);
            continue;
          }
        }

        manifestMap.set(filename, {
          id: `${mapping.folder}-${idx}`,
          filename,
          category: mapping.folder,
          path: relativeWebPath,
          title: photo.title || mapping.label,
          photographer: photo.photographer,
          photographer_url: photo.photographer_url,
          source_url: photo.source_url,
          api: photo.api,
          alt: photo.alt || `${mapping.label} photograph by ${photo.photographer}`
        });

        idx++;
      }
    }
  } else {
    // Curated download loop
    console.log('⬇️  Downloading curated image bundle...');
    for (const photo of CURATED_FALLBACK_PHOTOS) {
      const destPath = path.join(IMAGES_DIR, photo.category, photo.filename);
      const relativeWebPath = `/images/${photo.category}/${photo.filename}`;

      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
        console.log(`  ⏭️  [Cached] ${photo.category}/${photo.filename}`);
        totalSkipped++;
      } else {
        try {
          console.log(`  ⬇️  Downloading ${photo.category}/${photo.filename} (${photo.api} by ${photo.photographer})...`);
          await downloadImage(photo.url, destPath);
          const sizeKb = (fs.statSync(destPath).size / 1024).toFixed(1);
          console.log(`     ✅ Saved (${sizeKb} KB)`);
          totalDownloaded++;
          await sleep(300);
        } catch (err) {
          console.error(`     ❌ Error downloading ${photo.filename}:`, err.message);
          continue;
        }
      }

      manifestMap.set(photo.filename, {
        id: photo.filename.replace(/\.jpg$/, ''),
        filename: photo.filename,
        category: photo.category,
        path: relativeWebPath,
        title: photo.title,
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
        source_url: photo.source_url,
        api: photo.api,
        alt: photo.alt
      });
    }
  }

  // Save generated images.json manifest
  const finalManifest = Array.from(manifestMap.values());
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(finalManifest, null, 2), 'utf8');

  console.log('\n=============================================================');
  console.log(` ✨ ASSET FETCH COMPLETE!`);
  console.log(`    📁 Total Images in Manifest: ${finalManifest.length}`);
  console.log(`    📥 Newly Downloaded:        ${totalDownloaded}`);
  console.log(`    ⏭️  Skipped (Existing):      ${totalSkipped}`);
  console.log(`    📜 Manifest Saved to:       public/images/images.json`);
  console.log('=============================================================\n');
}

main().catch(err => {
  console.error('\n❌ Fatal error in fetch-images script:', err);
  process.exit(1);
});
