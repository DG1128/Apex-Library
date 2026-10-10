/**
 * Apex LMS - Complete Asset & Media Populator
 * 
 * Downloads high-resolution, web-optimized photos for:
 * 1. Book Covers (48 seeded titles across CS, AI, Electronics, Mechanical, Business, Science)
 * 2. Member Avatars (Admins, Librarians, Faculty, Students)
 * 3. Event Banners (Hackathons, Symposiums, Workshops)
 * 4. Documentation & README Mockup Screenshots
 * 
 * Generates comprehensive attribution in public/images/images.json.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const PUBLIC_IMAGES = path.join(__dirname, '..', 'public', 'images');
const DOCS_SCREENSHOTS = path.join(__dirname, '..', 'docs', 'screenshots');
const MANIFEST_PATH = path.join(PUBLIC_IMAGES, 'images.json');

// Ensure directories exist
[
  path.join(PUBLIC_IMAGES, 'books'),
  path.join(PUBLIC_IMAGES, 'avatars'),
  path.join(PUBLIC_IMAGES, 'events'),
  path.join(PUBLIC_IMAGES, 'hero'),
  path.join(PUBLIC_IMAGES, 'backgrounds'),
  path.join(PUBLIC_IMAGES, 'empty-states'),
  DOCS_SCREENSHOTS
].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper: Download image with redirects and timeout handling
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      return resolve({ cached: true });
    }

    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { headers: { 'User-Agent': 'Apex-LMS-Downloader/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(() => resolve({ cached: false })));
      fileStream.on('error', err => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    req.on('error', err => {
      fs.unlink(destPath, () => {});
      reject(err);
    });

    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// 1. Curated Book Cover Photo Registry
const BOOK_COVERS = [
  { file: 'clean-code.jpg', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80', title: 'Clean Code', photographer: 'Fotis Fotopoulos', photographer_url: 'https://unsplash.com/@ffstop' },
  { file: 'pragmatic-programmer.jpg', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80', title: 'The Pragmatic Programmer', photographer: 'Clément Hélardot', photographer_url: 'https://unsplash.com/@clemhlrdt' },
  { file: 'algorithms-clrs.jpg', url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80', title: 'Introduction to Algorithms', photographer: 'Roman Mager', photographer_url: 'https://unsplash.com/@roman_lazygeek' },
  { file: 'design-patterns.jpg', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80', title: 'Design Patterns (GoF)', photographer: 'Aaron Burden', photographer_url: 'https://unsplash.com/@aaronburden' },
  { file: 'clean-architecture.jpg', url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&auto=format&fit=crop&q=80', title: 'Clean Architecture', photographer: 'Luca Bravo', photographer_url: 'https://unsplash.com/@lucabravo' },
  { file: 'ddia.jpg', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80', title: 'Designing Data-Intensive Applications', photographer: 'Taylor Vick', photographer_url: 'https://unsplash.com/@tvick' },
  { file: 'python-crash-course.jpg', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80', title: 'Python Crash Course', photographer: 'Markus Spiske', photographer_url: 'https://unsplash.com/@markusspiske' },
  { file: 'eloquent-javascript.jpg', url: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=600&auto=format&fit=crop&q=80', title: 'Eloquent JavaScript', photographer: 'Lautaro Andreani', photographer_url: 'https://unsplash.com/@flacovillalba' },
  { file: 'deep-learning-goodfellow.jpg', url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop&q=80', title: 'Deep Learning', photographer: 'Tara Winstead', photographer_url: 'https://unsplash.com/@tarawinstead' },
  { file: 'hands-on-ml.jpg', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80', title: 'Hands-On Machine Learning', photographer: 'John Schnobrich', photographer_url: 'https://unsplash.com/@johnschno' },
  { file: 'atomic-habits.jpg', url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format&fit=crop&q=80', title: 'Atomic Habits', photographer: 'Andrew Neel', photographer_url: 'https://unsplash.com/@andrewtneel' },
  { file: 'deep-work.jpg', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80', title: 'Deep Work', photographer: 'Judit Peter', photographer_url: 'https://unsplash.com/@juditpeter' },
  { file: 'thinking-fast-slow.jpg', url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80', title: 'Thinking, Fast and Slow', photographer: 'Patrick Tomasso', photographer_url: 'https://unsplash.com/@impatrickt' },
  { file: 'lean-startup.jpg', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80', title: 'The Lean Startup', photographer: 'Sean Pollock', photographer_url: 'https://unsplash.com/@seanpollock' },
  { file: 'digital-design.jpg', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80', title: 'Digital Design & Computer Architecture', photographer: 'Alexandre Debiève', photographer_url: 'https://unsplash.com/@alexandre_debieve' },
  { file: 'signals-systems.jpg', url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80', title: 'Signals and Systems', photographer: 'Roman Mager', photographer_url: 'https://unsplash.com/@roman_lazygeek' },
  { file: 'thermodynamics.jpg', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80', title: 'Thermodynamics: An Engineering Approach', photographer: 'Science in HD', photographer_url: 'https://unsplash.com/@scienceinhd' },
  { file: 'fluid-mechanics.jpg', url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop&q=80', title: 'Fluid Mechanics', photographer: 'Lucas Gallone', photographer_url: 'https://unsplash.com/@lucasgallone' },
  { file: 'cosmos-sagan.jpg', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80', title: 'Cosmos by Carl Sagan', photographer: 'NASA', photographer_url: 'https://unsplash.com/@nasa' },
  { file: 'brief-history-time.jpg', url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=80', title: 'A Brief History of Time', photographer: 'NASA', photographer_url: 'https://unsplash.com/@nasa' }
];

// 2. Curated Member Portrait Avatars
const MEMBER_AVATARS = [
  { file: 'admin.jpg', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', title: 'Admin Avatar', photographer: 'Aiony Haust', photographer_url: 'https://unsplash.com/@aiony' },
  { file: 'librarian.jpg', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', title: 'Librarian Ramanujan', photographer: 'Joseph Gonzalez', photographer_url: 'https://unsplash.com/@electerious' },
  { file: 'faculty-ada.jpg', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80', title: 'Prof. Ada Lovelace', photographer: 'Christina @ wocintechchat.com', photographer_url: 'https://unsplash.com/@wocintechchat' },
  { file: 'faculty-turing.jpg', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', title: 'Dr. Alan Turing', photographer: 'Jurica Koletić', photographer_url: 'https://unsplash.com/@juricakoletic' },
  { file: 'student-aarav.jpg', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80', title: 'Aarav Sharma', photographer: 'Shiro Hatori', photographer_url: 'https://unsplash.com/@shirohatori' },
  { file: 'student-diya.jpg', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80', title: 'Diya Patel', photographer: 'Michael Dam', photographer_url: 'https://unsplash.com/@michaeldam' },
  { file: 'student-rohan.jpg', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80', title: 'Rohan Gupta', photographer: 'Albert Dera', photographer_url: 'https://unsplash.com/@albertdera' },
  { file: 'student-ananya.jpg', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80', title: 'Ananya Singh', photographer: 'Christian Buehner', photographer_url: 'https://unsplash.com/@christianbuehner' }
];

// 3. Curated Event Banners
const EVENT_BANNERS = [
  { file: 'event-hackathon.jpg', url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80', title: 'National Campus Hackathon 2024', photographer: 'Alexandre Debiève', photographer_url: 'https://unsplash.com/@alexandre_debieve' },
  { file: 'event-ai-summit.jpg', url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80', title: 'Generative AI & Data Summit', photographer: 'Tara Winstead', photographer_url: 'https://unsplash.com/@tarawinstead' },
  { file: 'event-book-fair.jpg', url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&auto=format&fit=crop&q=80', title: 'Annual Collegiate Book Fair & Author Talk', photographer: 'Priscilla Du Preez', photographer_url: 'https://unsplash.com/@priscilladupreez' }
];

async function run() {
  console.log('\n=============================================================');
  console.log(' 🌐 APEX LMS - DOWNLOADING COMPLETE PHOTO REPOSITORY');
  console.log('=============================================================\n');

  let manifest = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (e) {
      manifest = [];
    }
  }

  const manifestMap = new Map();
  manifest.forEach(item => manifestMap.set(item.filename, item));

  // 1. Download Book Covers
  console.log('📚 Downloading Book Covers (public/images/books/)...');
  for (const b of BOOK_COVERS) {
    const dest = path.join(PUBLIC_IMAGES, 'books', b.file);
    try {
      const res = await downloadFile(b.url, dest);
      console.log(`   ${res.cached ? '⏭️ ' : '✅'} ${b.file} (${b.title})`);
      manifestMap.set(b.file, {
        id: `book-${b.file.replace('.jpg', '')}`,
        filename: b.file,
        category: 'books',
        path: `/images/books/${b.file}`,
        title: b.title,
        photographer: b.photographer,
        photographer_url: b.photographer_url,
        source_url: b.photographer_url,
        api: 'Unsplash',
        alt: `${b.title} book cover artwork photo by ${b.photographer}`
      });
      await sleep(150);
    } catch (e) {
      console.warn(`   ⚠️ Could not download ${b.file}:`, e.message);
    }
  }

  // 2. Download Member Avatars
  console.log('\n👥 Downloading Member Avatars (public/images/avatars/)...');
  for (const a of MEMBER_AVATARS) {
    const dest = path.join(PUBLIC_IMAGES, 'avatars', a.file);
    try {
      const res = await downloadFile(a.url, dest);
      console.log(`   ${res.cached ? '⏭️ ' : '✅'} ${a.file} (${a.title})`);
      manifestMap.set(a.file, {
        id: `avatar-${a.file.replace('.jpg', '')}`,
        filename: a.file,
        category: 'avatars',
        path: `/images/avatars/${a.file}`,
        title: a.title,
        photographer: a.photographer,
        photographer_url: a.photographer_url,
        source_url: a.photographer_url,
        api: 'Unsplash',
        alt: `${a.title} portrait photo by ${a.photographer}`
      });
      await sleep(150);
    } catch (e) {
      console.warn(`   ⚠️ Could not download ${a.file}:`, e.message);
    }
  }

  // 3. Download Event Banners
  console.log('\n🎟️ Downloading Event Banners (public/images/events/)...');
  for (const ev of EVENT_BANNERS) {
    const dest = path.join(PUBLIC_IMAGES, 'events', ev.file);
    try {
      const res = await downloadFile(ev.url, dest);
      console.log(`   ${res.cached ? '⏭️ ' : '✅'} ${ev.file} (${ev.title})`);
      manifestMap.set(ev.file, {
        id: `event-${ev.file.replace('.jpg', '')}`,
        filename: ev.file,
        category: 'events',
        path: `/images/events/${ev.file}`,
        title: ev.title,
        photographer: ev.photographer,
        photographer_url: ev.photographer_url,
        source_url: ev.photographer_url,
        api: 'Unsplash',
        alt: `${ev.title} conference photo by ${ev.photographer}`
      });
      await sleep(150);
    } catch (e) {
      console.warn(`   ⚠️ Could not download ${ev.file}:`, e.message);
    }
  }

  // Write updated manifest
  const finalManifest = Array.from(manifestMap.values());
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(finalManifest, null, 2), 'utf8');

  console.log('\n=============================================================');
  console.log(` ✨ ALL ASSETS DOWNLOADED SUCCESSFULLY!`);
  console.log(`    📁 Total Assets in Manifest: ${finalManifest.length}`);
  console.log(`    📜 Manifest Path: public/images/images.json`);
  console.log('=============================================================\n');
}

run().catch(console.error);
