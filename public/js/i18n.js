// Offline i18n Translation Dictionary (English, Hindi, Gujarati)

const TRANSLATIONS = {
  en: {
    app_name: 'Apex Library',
    tagline: 'College Knowledge Hub',
    search_placeholder: "Search 'Python', 'Algorithms', author name, ISBN...",
    search_hint: "Press Ctrl + K to search anywhere",
    all_categories: 'All Categories',
    available_now: 'Available Now',
    new_arrivals: 'New Arrivals',
    trending: 'Trending',
    my_department: 'My Department',
    my_shelf: 'My Shelf',
    kiosk_mode: 'Kiosk Terminal',
    circulation: 'Circulation',
    books: 'Books Catalog',
    members: 'Members',
    fines: 'Fines & Dues',
    reservations: 'Reservations',
    reports: 'Reports & Stats',
    settings: 'Settings',
    leaderboard: 'Leaderboard',
    suggestions: 'Suggest Books',
    login: 'Log In',
    logout: 'Sign Out',
    due_soon: 'Due Soon',
    overdue: 'Overdue',
    issued: 'Issued',
    available: 'Available',
    reserve: 'Reserve',
    renew: 'Renew',
    shelf_location: 'Shelf Location',
    copies: 'Copies',
    return_book: 'Return Book',
    issue_book: 'Issue Book',
    reading_streak: 'Reading Streak',
    days_left: 'days left',
    collect_fine: 'Collect Fine',
    receipt_no: 'Receipt No.',
    backup_db: 'Backup Database'
  },
  hi: {
    app_name: 'एपेक्स पुस्तकालय',
    tagline: 'कॉलेज ज्ञान केंद्र',
    search_placeholder: "किताब का नाम, लेखक, 'पायथन', ISBN खोजें...",
    search_hint: "कहीं भी खोजने के लिए Ctrl + K दबाएं",
    all_categories: 'सभी श्रेणियां',
    available_now: 'उपलब्ध किताबें',
    new_arrivals: 'नवीनतम आगमन',
    trending: 'लोकप्रिय',
    my_department: 'मेरा विभाग',
    my_shelf: 'मेरी किताबें',
    kiosk_mode: 'कियोस्क टर्मिनल',
    circulation: 'लेन-देन (वितरण)',
    books: 'किताब सूची',
    members: 'सदस्य',
    fines: 'जुर्माना और शुल्क',
    reservations: 'आरक्षण सूची',
    reports: 'रिपोर्ट और आंकड़े',
    settings: 'सेटिंग्स',
    leaderboard: 'लीडरबोर्ड',
    suggestions: 'किताब सुझाव',
    login: 'लॉग इन',
    logout: 'लॉग आउट',
    due_soon: 'जल्द देय',
    overdue: 'अतिदेय',
    issued: 'जारी किया गया',
    available: 'उपलब्ध',
    reserve: 'आरक्षित करें',
    renew: 'नवीनीकरण',
    shelf_location: 'रैक और शेल्फ स्थान',
    copies: 'प्रतियां',
    return_book: 'किताब वापस करें',
    issue_book: 'किताब जारी करें',
    reading_streak: 'पठन निरंतरता',
    days_left: 'दिन शेष',
    collect_fine: 'जुर्माना प्राप्त करें',
    receipt_no: 'रसीद संख्या',
    backup_db: 'डेटाबेस बैकअप'
  },
  gu: {
    app_name: 'એપેક્સ ગ્રંથાલય',
    tagline: 'કોલેજ જ્ઞાન કેન્દ્ર',
    search_placeholder: "પુસ્તકનું નામ, લેખક, 'પાયથોન', ISBN શોધો...",
    search_hint: "શોધવા માટે Ctrl + K દબાવો",
    all_categories: 'બધી શ્રેણીઓ',
    available_now: 'ઉપલબ્ધ પુસ્તકો',
    new_arrivals: 'નવા આગમન',
    trending: 'લોકપ્રિય',
    my_department: 'મારો વિભાગ',
    my_shelf: 'મારા પુસ્તકો',
    kiosk_mode: 'કિયોસ્ક ટર્મિનલ',
    circulation: 'આપ-લે (સર્ક્યુલેશન)',
    books: 'પુસ્તક સૂચિ',
    members: 'સભ્યો',
    fines: 'દંડ અને ફી',
    reservations: 'આરક્ષણ',
    reports: 'અહેવાલો અને આંકડા',
    settings: 'સેટિંગ્સ',
    leaderboard: 'લીડરબોર્ડ',
    suggestions: 'પુસ્તક સૂચન',
    login: 'લૉગ ઇન',
    logout: 'સાઇન આઉટ',
    due_soon: 'ટૂંક સમયમાં બાકી',
    overdue: 'મુદત વીતી ગયેલ',
    issued: 'ઇશ્યૂ થયેલ',
    available: 'ઉપલબ્ધ',
    reserve: 'રિઝર્વ કરો',
    renew: 'રીન્યુ કરો',
    shelf_location: 'કબાટ / શેલ્ફ સ્થાન',
    copies: 'નકલો',
    return_book: 'પુસ્તક જમા કરો',
    issue_book: 'પુસ્તક આપો',
    reading_streak: 'વાંચન સાતત્ય',
    days_left: 'દિવસ બાકી',
    collect_fine: 'દંડ વસૂલો',
    receipt_no: 'પહોંચ નંબર',
    backup_db: 'બેકઅપ લો'
  }
};

let currentLang = localStorage.getItem('lms_lang') || 'en';

function setLanguage(lang) {
  if (TRANSLATIONS[lang]) {
    currentLang = lang;
    localStorage.setItem('lms_lang', lang);
    document.documentElement.lang = lang;
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }
}

function getLanguage() {
  return currentLang;
}

function t(key, defaultVal = '') {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || defaultVal || key;
}
