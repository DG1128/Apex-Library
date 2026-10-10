const bcrypt = require('bcryptjs');
const { db } = require('./db');

console.log('🌱 Seeding college library database with realistic dataset...');

// Helper to hash passwords
const hash = (pwd) => bcrypt.hashSync(pwd, 10);

const seedAll = db.transaction(() => {
  // Clear existing records
  db.exec(`
    DELETE FROM member_badges;
    DELETE FROM audit_logs;
    DELETE FROM book_suggestions;
    DELETE FROM fines;
    DELETE FROM reservations;
    DELETE FROM transactions;
    DELETE FROM book_copies;
    DELETE FROM books;
    DELETE FROM categories;
    DELETE FROM users;
  `);

  // 1. Insert Users / Members
  const insertUser = db.prepare(`
    INSERT INTO users (member_id, name, email, phone, role, department, semester, password_hash, force_password_change, validity_date, status, reading_streak, books_read_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const passwordDefault = hash('password123');
  const adminPassword = hash('admin127'); // Default admin password (must change on first login)

  // Admin & Staff
  const admin = insertUser.run('ADMIN001', 'Admin Librarian', 'admin@college.edu', '+91 9876543210', 'admin', 'Library Administration', 'Staff', adminPassword, 1, '2030-12-31', 'active', 0, 0);
  const librarian = insertUser.run('LIB001', 'Prof. S. Ramanujan', 'ramanujan@college.edu', '+91 9876543211', 'librarian', 'Library Administration', 'Senior Librarian', passwordDefault, 0, '2028-12-31', 'active', 0, 0);

  // Faculty Members
  const fac1 = insertUser.run('FAC001', 'Prof. Ada Lovelace', 'ada@college.edu', '+91 9876543212', 'faculty', 'Computer Science', 'Faculty', passwordDefault, 0, '2028-12-31', 'active', 5, 18);
  const fac2 = insertUser.run('FAC-CS-101', 'Dr. Alan Turing', 'alan@college.edu', '+91 9876543213', 'faculty', 'Computer Science', 'HOD', passwordDefault, 0, '2028-12-31', 'active', 8, 32);
  const fac3 = insertUser.run('FAC-EC-102', 'Dr. Claude Shannon', 'shannon@college.edu', '+91 9876543214', 'faculty', 'Electronics & Comm', 'Faculty', passwordDefault, 0, '2028-12-31', 'active', 3, 14);
  const fac4 = insertUser.run('FAC-ME-103', 'Dr. Nikola Tesla', 'tesla@college.edu', '+91 9876543215', 'faculty', 'Mechanical Engg', 'Faculty', passwordDefault, 0, '2028-12-31', 'active', 6, 21);
  const fac5 = insertUser.run('FAC-MG-104', 'Dr. Peter Drucker', 'drucker@college.edu', '+91 9876543216', 'faculty', 'Management & Business', 'Faculty', passwordDefault, 0, '2028-12-31', 'active', 2, 9);
  const fac6 = insertUser.run('FAC-MA-105', 'Dr. Emmy Noether', 'noether@college.edu', '+91 9876543217', 'faculty', 'Mathematics', 'Faculty', passwordDefault, 0, '2028-12-31', 'active', 7, 27);

  // Students
  const stu1 = insertUser.run('STU2024001', 'Aarav Sharma', 'aarav.cs@college.edu', '+91 9811122233', 'student', 'Computer Science', 'Semester 4', passwordDefault, 0, '2026-06-30', 'active', 12, 14);
  const stu2 = insertUser.run('STU2024002', 'Diya Patel', 'diya.cs@college.edu', '+91 9822233344', 'student', 'Computer Science', 'Semester 4', passwordDefault, 0, '2026-06-30', 'active', 9, 11);
  const stu3 = insertUser.run('STU2024003', 'Rohan Gupta', 'rohan.ec@college.edu', '+91 9833344455', 'student', 'Electronics & Comm', 'Semester 6', passwordDefault, 0, '2025-06-30', 'active', 4, 7);
  const stu4 = insertUser.run('STU2024004', 'Ananya Singh', 'ananya.me@college.edu', '+91 9844455566', 'student', 'Mechanical Engg', 'Semester 2', passwordDefault, 0, '2027-06-30', 'active', 6, 8);
  const stu5 = insertUser.run('STU2024005', 'Kabir Mehta', 'kabir.cs@college.edu', '+91 9855566677', 'student', 'Computer Science', 'Semester 8', passwordDefault, 0, '2025-06-30', 'active', 15, 23);
  const stu6 = insertUser.run('STU2024006', 'Pooja Verma', 'pooja.mba@college.edu', '+91 9866677788', 'student', 'Management & Business', 'Semester 3', passwordDefault, 0, '2025-12-31', 'active', 3, 5);
  const stu7 = insertUser.run('STU2024007', 'Vikram Reddy', 'vikram.ce@college.edu', '+91 9877788899', 'student', 'Civil Engg', 'Semester 5', passwordDefault, 0, '2026-06-30', 'active', 1, 3);
  const stu8 = insertUser.run('STU2024008', 'Neha Joshi', 'neha.bt@college.edu', '+91 9888899900', 'student', 'Biotechnology', 'Semester 4', passwordDefault, 0, '2026-06-30', 'active', 5, 6);
  const stu9 = insertUser.run('STU2024009', 'Siddharth Nair', 'siddharth.cs@college.edu', '+91 9899900011', 'student', 'Computer Science', 'Semester 2', passwordDefault, 0, '2027-06-30', 'active', 2, 4);
  const stu10 = insertUser.run('STU2024010', 'Ishaan Deshmukh', 'ishaan.it@college.edu', '+91 9800011122', 'student', 'Information Technology', 'Semester 6', passwordDefault, 0, '2025-06-30', 'active', 7, 10);
  const stu11 = insertUser.run('STU2024011', 'Meera Iyer', 'meera.ee@college.edu', '+91 9811223344', 'student', 'Electrical Engg', 'Semester 4', passwordDefault, 0, '2026-06-30', 'active', 4, 6);
  const stu12 = insertUser.run('STU2024012', 'Aditya Kulkarni', 'aditya.cs@college.edu', '+91 9822334455', 'student', 'Computer Science', 'Semester 4', passwordDefault, 0, '2026-06-30', 'active', 8, 12);
  const stu13 = insertUser.run('STU2024013', 'Tanya Roy', 'tanya.mba@college.edu', '+91 9833445566', 'student', 'Management & Business', 'Semester 1', passwordDefault, 0, '2026-06-30', 'active', 0, 1);
  const stu14 = insertUser.run('STU2024014', 'Varun Bhatia', 'varun.me@college.edu', '+91 9844556677', 'student', 'Mechanical Engg', 'Semester 6', passwordDefault, 0, '2025-06-30', 'active', 2, 5);
  const stu15 = insertUser.run('STU2024015', 'Kritika Sen', 'kritika.ec@college.edu', '+91 9855667788', 'student', 'Electronics & Comm', 'Semester 4', passwordDefault, 0, '2026-06-30', 'active', 6, 9);
  const stu16 = insertUser.run('STU2024016', 'Rahul Kapoor', 'rahul.cs@college.edu', '+91 9866778899', 'student', 'Computer Science', 'Semester 2', passwordDefault, 0, '2027-06-30', 'deactivated', 0, 2);

  // 2. Insert Categories
  const insertCat = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
  const categoriesList = [
    ['Computer Science', 'Software engineering, algorithms, architectures, web & cloud'],
    ['Artificial Intelligence & Data', 'Machine learning, neural networks, data analysis, NLP'],
    ['Electronics & Hardware', 'Circuits, microcontrollers, VLSI, signal processing, IoT'],
    ['Mechanical Engineering', 'Thermodynamics, robotics, CAD/CAM, fluid mechanics'],
    ['Civil Engineering', 'Structural engineering, geotech, transport, environmental'],
    ['Mathematics & Physics', 'Calculus, linear algebra, statistics, discrete maths, quantum'],
    ['Management & Business', 'Finance, operations, entrepreneurship, product management'],
    ['Self Improvement & Career', 'Productivity, career growth, psychology, leadership'],
    ['Literature & Humanities', 'Fiction, classics, philosophy, communication']
  ];
  for (const [name, desc] of categoriesList) {
    insertCat.run(name, desc);
  }

  // 3. Insert Books Catalog
  const insertBook = db.prepare(`
    INSERT INTO books (
      accession_no, isbn, title, author, publisher, edition, year,
      category, department, language, total_copies, available_copies,
      shelf_location, price, status, cover_color, is_new_arrival, total_issues_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCopy = db.prepare(`
    INSERT INTO book_copies (book_id, barcode, copy_number, status)
    VALUES (?, ?, ?, ?)
  `);

  const booksData = [
    // Computer Science
    ['ACC-1001', '978-0132350884', 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 'Prentice Hall', '1st', 2008, 'Computer Science', 'Computer Science', 'English', 5, 3, 'Rack CS-01, Shelf A', 650.0, 'active', '#6366f1', 0, 48],
    ['ACC-1002', '978-0262033848', 'Introduction to Algorithms (CLRS)', 'Thomas H. Cormen, Charles E. Leiserson', 'MIT Press', '4th', 2022, 'Computer Science', 'Computer Science', 'English', 6, 4, 'Rack CS-01, Shelf B', 1200.0, 'active', '#8b5cf6', 0, 72],
    ['ACC-1003', '978-1449373320', 'Designing Data-Intensive Applications', 'Martin Kleppmann', "O'Reilly Media", '1st', 2017, 'Computer Science', 'Computer Science', 'English', 4, 0, 'Rack CS-01, Shelf C', 980.0, 'active', '#ec4899', 1, 65], // 0 copies for reservation testing
    ['ACC-1004', '978-0131103627', 'The C Programming Language', 'Brian W. Kernighan, Dennis M. Ritchie', 'Prentice Hall', '2nd', 1988, 'Computer Science', 'Computer Science', 'English', 4, 3, 'Rack CS-02, Shelf A', 450.0, 'active', '#3b82f6', 0, 31],
    ['ACC-1005', '978-0201616224', 'The Pragmatic Programmer: Your Journey to Mastery', 'David Thomas, Andrew Hunt', 'Addison-Wesley', '20th Anniv', 2019, 'Computer Science', 'Computer Science', 'English', 4, 2, 'Rack CS-02, Shelf B', 820.0, 'active', '#10b981', 1, 42],
    ['ACC-1006', '978-1118063330', 'Operating System Concepts', 'Abraham Silberschatz, Peter B. Galvin', 'Wiley', '10th', 2018, 'Computer Science', 'Computer Science', 'English', 5, 3, 'Rack CS-02, Shelf C', 890.0, 'active', '#f59e0b', 0, 39],
    ['ACC-1007', '978-0078022159', 'Database System Concepts', 'Avi Silberschatz, Henry F. Korth', 'McGraw-Hill', '7th', 2019, 'Computer Science', 'Computer Science', 'English', 5, 4, 'Rack CS-03, Shelf A', 790.0, 'active', '#06b6d4', 0, 35],
    ['ACC-1008', '978-0133594140', 'Computer Networks: A Systems Approach', 'Larry L. Peterson, Bruce S. Davie', 'Morgan Kaufmann', '5th', 2011, 'Computer Science', 'Computer Science', 'English', 3, 2, 'Rack CS-03, Shelf B', 740.0, 'active', '#84cc16', 0, 27],
    ['ACC-1009', '978-0321125217', 'Domain-Driven Design: Tackling Complexity in Software', 'Eric Evans', 'Addison-Wesley', '1st', 2003, 'Computer Science', 'Computer Science', 'English', 3, 2, 'Rack CS-03, Shelf C', 910.0, 'active', '#14b8a6', 0, 19],
    ['ACC-1010', '978-0262510875', 'Structure and Interpretation of Computer Programs (SICP)', 'Harold Abelson, Gerald Jay Sussman', 'MIT Press', '2nd', 1996, 'Computer Science', 'Computer Science', 'English', 3, 2, 'Rack CS-04, Shelf A', 1150.0, 'active', '#a855f7', 0, 22],
    ['ACC-1011', '978-0984782857', 'Cracking the Coding Interview', 'Gayle Laakmann McDowell', 'CareerCup', '6th', 2015, 'Computer Science', 'Computer Science', 'English', 6, 1, 'Rack CS-04, Shelf B', 750.0, 'active', '#f43f5e', 0, 89],
    ['ACC-1012', '978-1491950357', 'Building Microservices: Designing Fine-Grained Systems', 'Sam Newman', "O'Reilly Media", '2nd', 2021, 'Computer Science', 'Computer Science', 'English', 4, 3, 'Rack CS-04, Shelf C', 870.0, 'active', '#eab308', 1, 29],
    ['ACC-1013', '978-1593279288', 'Python Crash Course: A Hands-On Project-Based Intro', 'Eric Matthes', 'No Starch Press', '3rd', 2023, 'Computer Science', 'Computer Science', 'English', 5, 4, 'Rack CS-05, Shelf A', 690.0, 'active', '#22c55e', 1, 51],
    ['ACC-1014', '978-0134494166', 'Clean Architecture: A Craftsman Guide to Software Structure', 'Robert C. Martin', 'Prentice Hall', '1st', 2017, 'Computer Science', 'Computer Science', 'English', 4, 3, 'Rack CS-05, Shelf B', 720.0, 'active', '#0ea5e9', 0, 36],

    // Artificial Intelligence & Data Science
    ['ACC-2001', '978-0134610993', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell, Peter Norvig', 'Pearson', '4th', 2020, 'Artificial Intelligence & Data', 'Computer Science', 'English', 5, 2, 'Rack AI-01, Shelf A', 1350.0, 'active', '#6366f1', 1, 62],
    ['ACC-2002', '978-0262035613', 'Deep Learning (Adaptive Computation and Machine Learning)', 'Ian Goodfellow, Yoshua Bengio, Aaron Courville', 'MIT Press', '1st', 2016, 'Artificial Intelligence & Data', 'Computer Science', 'English', 4, 2, 'Rack AI-01, Shelf B', 1100.0, 'active', '#ec4899', 0, 47],
    ['ACC-2003', '978-1492032649', 'Hands-On Machine Learning with Scikit-Learn, Keras, & TF', 'Aurélien Géron', "O'Reilly Media", '3rd', 2022, 'Artificial Intelligence & Data', 'Computer Science', 'English', 5, 3, 'Rack AI-01, Shelf C', 1050.0, 'active', '#f59e0b', 1, 58],
    ['ACC-2004', '978-0134845623', 'Pattern Recognition and Machine Learning', 'Christopher M. Bishop', 'Springer', '1st', 2006, 'Artificial Intelligence & Data', 'Mathematics', 'English', 3, 2, 'Rack AI-02, Shelf A', 1250.0, 'active', '#8b5cf6', 0, 24],
    ['ACC-2005', '978-1491957660', 'Python for Data Analysis: Data Wrangling with Pandas', 'Wes McKinney', "O'Reilly Media", '3rd', 2022, 'Artificial Intelligence & Data', 'Computer Science', 'English', 4, 3, 'Rack AI-02, Shelf B', 820.0, 'active', '#10b981', 1, 38],
    ['ACC-2006', '978-1098135805', 'Designing Machine Learning Systems', 'Chip Huyen', "O'Reilly Media", '1st', 2022, 'Artificial Intelligence & Data', 'Computer Science', 'English', 3, 2, 'Rack AI-02, Shelf C', 920.0, 'active', '#3b82f6', 1, 31],

    // Electronics & Hardware
    ['ACC-3001', '978-0134549897', 'Digital Design: With an Introduction to Verilog HDL', 'M. Morris Mano, Michael D. Ciletti', 'Pearson', '6th', 2017, 'Electronics & Hardware', 'Electronics & Comm', 'English', 4, 3, 'Rack EC-01, Shelf A', 680.0, 'active', '#06b6d4', 0, 29],
    ['ACC-3002', '978-0190853402', 'Microelectronic Circuits (The Oxford Series)', 'Adel S. Sedra, Kenneth C. Smith', 'Oxford University Press', '8th', 2019, 'Electronics & Hardware', 'Electronics & Comm', 'English', 4, 2, 'Rack EC-01, Shelf B', 950.0, 'active', '#f43f5e', 0, 33],
    ['ACC-3003', '978-0131987388', 'Signals and Systems', 'Alan V. Oppenheim, Alan S. Willsky', 'Prentice Hall', '2nd', 1996, 'Electronics & Hardware', 'Electronics & Comm', 'English', 4, 3, 'Rack EC-01, Shelf C', 780.0, 'active', '#84cc16', 0, 26],
    ['ACC-3004', '978-0132622264', 'Electronic Devices and Circuit Theory', 'Robert L. Boylestad, Louis Nashelsky', 'Pearson', '11th', 2012, 'Electronics & Hardware', 'Electronics & Comm', 'English', 5, 4, 'Rack EC-02, Shelf A', 720.0, 'active', '#eab308', 0, 30],
    ['ACC-3005', '978-0470531082', 'FPGA Prototyping by Verilog Examples', 'Pong P. Chu', 'Wiley-Interscience', '1st', 2008, 'Electronics & Hardware', 'Electronics & Comm', 'English', 3, 2, 'Rack EC-02, Shelf B', 890.0, 'active', '#14b8a6', 0, 15],

    // Mechanical & Civil Engineering
    ['ACC-4001', '978-9352606429', 'Engineering Thermodynamics', 'P. K. Nag', 'McGraw-Hill', '6th', 2017, 'Mechanical Engineering', 'Mechanical Engg', 'English', 5, 3, 'Rack ME-01, Shelf A', 610.0, 'active', '#f59e0b', 0, 38],
    ['ACC-4002', '978-8121925242', 'Theory of Machines', 'R. S. Khurmi, J. K. Gupta', 'S. Chand Publishing', '14th', 2005, 'Mechanical Engineering', 'Mechanical Engg', 'English', 5, 4, 'Rack ME-01, Shelf B', 550.0, 'active', '#ef4444', 0, 41],
    ['ACC-4003', '978-0073398273', 'Fluid Mechanics in SI Units', 'Frank M. White', 'McGraw-Hill', '8th', 2015, 'Mechanical Engineering', 'Mechanical Engg', 'English', 4, 3, 'Rack ME-01, Shelf C', 840.0, 'active', '#0284c7', 0, 22],
    ['ACC-4004', '978-8187433545', 'Strength of Materials', 'S. Ramamrutham, R. Narayanan', 'Dhanpat Rai Publishing', '18th', 2014, 'Civil Engineering', 'Civil Engg', 'English', 5, 4, 'Rack CE-01, Shelf A', 490.0, 'active', '#65a30d', 0, 34],
    ['ACC-4005', '978-9389811445', 'Design of Steel Structures', 'N. Subramanian', 'Oxford University Press', '2nd', 2018, 'Civil Engineering', 'Civil Engg', 'English', 3, 2, 'Rack CE-01, Shelf B', 670.0, 'active', '#d97706', 0, 18],

    // Mathematics & Physics
    ['ACC-5001', '978-0470458211', 'Advanced Engineering Mathematics', 'Erwin Kreyszig', 'Wiley', '10th', 2011, 'Mathematics & Physics', 'Mathematics', 'English', 6, 4, 'Rack MA-01, Shelf A', 920.0, 'active', '#6366f1', 0, 52],
    ['ACC-5002', '978-8174091955', 'Higher Engineering Mathematics', 'B. S. Grewal', 'Khanna Publishers', '44th', 2017, 'Mathematics & Physics', 'Mathematics', 'English', 8, 6, 'Rack MA-01, Shelf B', 650.0, 'active', '#8b5cf6', 0, 85],
    ['ACC-5003', '978-0030105678', 'Linear Algebra and Its Applications', 'Gilbert Strang', 'Cengage Learning', '4th', 2005, 'Mathematics & Physics', 'Mathematics', 'English', 4, 3, 'Rack MA-01, Shelf C', 780.0, 'active', '#3b82f6', 0, 44],
    ['ACC-5004', '978-0073383095', 'Discrete Mathematics and Its Applications', 'Kenneth H. Rosen', 'McGraw-Hill', '8th', 2018, 'Mathematics & Physics', 'Mathematics', 'English', 5, 3, 'Rack MA-02, Shelf A', 860.0, 'active', '#06b6d4', 0, 40],
    ['ACC-5005', '978-0131118928', 'Introduction to Quantum Mechanics', 'David J. Griffiths, Darrell F. Schroeter', 'Cambridge University Press', '3rd', 2018, 'Mathematics & Physics', 'Physics', 'English', 3, 2, 'Rack PH-01, Shelf A', 740.0, 'active', '#ec4899', 0, 21],

    // Management & Business
    ['ACC-6001', '978-0670921607', 'The Lean Startup: Constant Innovation for Radically Successful Business', 'Eric Ries', 'Crown Business', '1st', 2011, 'Management & Business', 'Management & Business', 'English', 4, 3, 'Rack MG-01, Shelf A', 520.0, 'active', '#10b981', 0, 37],
    ['ACC-6002', '978-0804139298', 'Zero to One: Notes on Startups, or How to Build the Future', 'Peter Thiel, Blake Masters', 'Currency', '1st', 2014, 'Management & Business', 'Management & Business', 'English', 4, 2, 'Rack MG-01, Shelf B', 480.0, 'active', '#f43f5e', 0, 43],
    ['ACC-6003', '978-0066620992', 'Good to Great: Why Some Companies Make the Leap... and Others Don\'t', 'Jim Collins', 'HarperBusiness', '1st', 2001, 'Management & Business', 'Management & Business', 'English', 3, 2, 'Rack MG-01, Shelf C', 590.0, 'active', '#f59e0b', 0, 28],
    ['ACC-6004', '978-0134472133', 'Marketing Management', 'Philip Kotler, Kevin Lane Keller', 'Pearson', '15th', 2015, 'Management & Business', 'Management & Business', 'English', 4, 3, 'Rack MG-02, Shelf A', 880.0, 'active', '#84cc16', 0, 31],

    // Self Improvement & Career
    ['ACC-7001', '978-0735211292', 'Atomic Habits: An Easy & Proven Way to Build Good Habits', 'James Clear', 'Avery', '1st', 2018, 'Self Improvement & Career', 'General', 'English', 6, 4, 'Rack GN-01, Shelf A', 490.0, 'active', '#14b8a6', 1, 95],
    ['ACC-7002', '978-1455586691', 'Deep Work: Rules for Focused Success in a Distracted World', 'Cal Newport', 'Grand Central Publishing', '1st', 2016, 'Self Improvement & Career', 'General', 'English', 5, 3, 'Rack GN-01, Shelf B', 450.0, 'active', '#6366f1', 0, 68],
    ['ACC-7003', '978-0857197689', 'The Psychology of Money: Timeless Lessons on Wealth and Greed', 'Morgan Housel', 'Harriman House', '1st', 2020, 'Self Improvement & Career', 'General', 'English', 5, 3, 'Rack GN-01, Shelf C', 390.0, 'active', '#eab308', 1, 84],
    ['ACC-7004', '978-8173711466', 'Wings of Fire: An Autobiography', 'A. P. J. Abdul Kalam, Arun Tiwari', 'Universities Press', '1st', 1999, 'Self Improvement & Career', 'General', 'English', 4, 3, 'Rack GN-02, Shelf A', 320.0, 'active', '#0ea5e9', 0, 56],
    ['ACC-7005', '978-0062316097', 'Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', 'Harper', '1st', 2015, 'Literature & Humanities', 'General', 'English', 4, 2, 'Rack GN-02, Shelf B', 520.0, 'active', '#a855f7', 0, 61],

    // Regional & Gujarati / Hindi Literature
    ['ACC-8001', '978-8170280453', 'Godan (Hindi Classic)', 'Munshi Premchand', 'Rajkamal Prakashan', '1st', 1936, 'Literature & Humanities', 'Literature', 'Hindi', 3, 2, 'Rack LIT-01, Shelf A', 220.0, 'active', '#ef4444', 0, 25],
    ['ACC-8002', '978-8172970031', 'Gujarat No Nath (Gujarati Classic)', 'K. M. Munshi', 'Gurjar Sahitya', '1st', 1917, 'Literature & Humanities', 'Literature', 'Gujarati', 3, 2, 'Rack LIT-01, Shelf B', 250.0, 'active', '#f59e0b', 0, 19],
    ['ACC-8003', '978-8172970222', 'Saraswatichandra', 'Govardhanram Tripathi', 'Gurjar Sahitya', '1st', 1887, 'Literature & Humanities', 'Literature', 'Gujarati', 2, 2, 'Rack LIT-01, Shelf C', 380.0, 'active', '#10b981', 0, 14],
    ['ACC-8004', '978-8170282112', 'Madhushala', 'Harivansh Rai Bachchan', 'Rajkamal Prakashan', '1st', 1935, 'Literature & Humanities', 'Literature', 'Hindi', 3, 2, 'Rack LIT-02, Shelf A', 190.0, 'active', '#ec4899', 0, 23]
  ];

  const bookIdMap = {};

  for (const b of booksData) {
    const res = insertBook.run(...b);
    const bookId = res.lastInsertRowid;
    bookIdMap[b[0]] = bookId;

    const totalCopies = b[10];
    const availableCopies = b[11];
    const issuedCopiesCount = totalCopies - availableCopies;

    for (let c = 1; c <= totalCopies; c++) {
      const copyBarcode = `${b[0]}-C${c}`;
      // mark first few as issued if available_copies < total_copies
      const copyStatus = c <= issuedCopiesCount ? 'issued' : 'available';
      insertCopy.run(bookId, copyBarcode, c, copyStatus);
    }
  }

  // 4. Insert Transactions (Active loans, Returned history, Overdue items)
  const insertTrans = db.prepare(`
    INSERT INTO transactions (
      book_id, copy_barcode, member_id, issue_date, due_date, return_date,
      renewal_count, status, issued_by, returned_by, fine_amount, fine_paid, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString().replace('T', ' ').substring(0, 19);
  const daysFromNow = (d) => new Date(now.getTime() + d * 86400000).toISOString().replace('T', ' ').substring(0, 19);

  // Active transaction 1: Clean Code issued to Student Aarav Sharma (Due in 5 days)
  const t1 = insertTrans.run(
    bookIdMap['ACC-1001'], 'ACC-1001-C1', stu1.lastInsertRowid,
    daysAgo(9), daysFromNow(5), null, 0, 'issued', librarian.lastInsertRowid, null, 0.0, 0, 'Standard loan'
  );

  // Active transaction 2: Python Crash Course issued to Student Diya Patel (Due in 2 days)
  const t2 = insertTrans.run(
    bookIdMap['ACC-1013'], 'ACC-1013-C1', stu2.lastInsertRowid,
    daysAgo(12), daysFromNow(2), null, 1, 'issued', librarian.lastInsertRowid, null, 0.0, 0, 'Renewed once online'
  );

  // Active transaction 3: OVERDUE! Introduction to Algorithms to Student Rohan Gupta (Overdue by 6 days)
  const t3 = insertTrans.run(
    bookIdMap['ACC-1002'], 'ACC-1002-C1', stu3.lastInsertRowid,
    daysAgo(20), daysAgo(6), null, 0, 'overdue', librarian.lastInsertRowid, null, 12.0, 0, 'Overdue reminder notice sent'
  );

  // Active transaction 4: OVERDUE! Cracking the Coding Interview to Student Kabir Mehta (Overdue by 3 days)
  const t4 = insertTrans.run(
    bookIdMap['ACC-1011'], 'ACC-1011-C1', stu5.lastInsertRowid,
    daysAgo(17), daysAgo(3), null, 0, 'overdue', librarian.lastInsertRowid, null, 6.0, 0, 'Overdue loan'
  );

  // Active transaction 5: Faculty loan: AI A Modern Approach to Prof Ada Lovelace (Due in 18 days)
  const t5 = insertTrans.run(
    bookIdMap['ACC-2001'], 'ACC-2001-C1', fac1.lastInsertRowid,
    daysAgo(12), daysFromNow(18), null, 0, 'issued', librarian.lastInsertRowid, null, 0.0, 0, 'Faculty research copy'
  );

  // Active transaction 6: All copies of Designing Data-Intensive Applications currently issued
  insertTrans.run(bookIdMap['ACC-1003'], 'ACC-1003-C1', stu9.lastInsertRowid, daysAgo(4), daysFromNow(10), null, 0, 'issued', librarian.lastInsertRowid, null, 0, 0, '');
  insertTrans.run(bookIdMap['ACC-1003'], 'ACC-1003-C2', stu10.lastInsertRowid, daysAgo(5), daysFromNow(9), null, 0, 'issued', librarian.lastInsertRowid, null, 0, 0, '');
  insertTrans.run(bookIdMap['ACC-1003'], 'ACC-1003-C3', stu12.lastInsertRowid, daysAgo(2), daysFromNow(12), null, 0, 'issued', librarian.lastInsertRowid, null, 0, 0, '');
  insertTrans.run(bookIdMap['ACC-1003'], 'ACC-1003-C4', fac2.lastInsertRowid, daysAgo(10), daysFromNow(20), null, 0, 'issued', librarian.lastInsertRowid, null, 0, 0, '');

  // Returned transactions (Historical for analytics)
  insertTrans.run(bookIdMap['ACC-7001'], 'ACC-7001-C1', stu1.lastInsertRowid, daysAgo(30), daysAgo(16), daysAgo(18), 0, 'returned', librarian.lastInsertRowid, librarian.lastInsertRowid, 0.0, 0, 'Returned in good condition');
  insertTrans.run(bookIdMap['ACC-7002'], 'ACC-7002-C1', stu1.lastInsertRowid, daysAgo(45), daysAgo(31), daysAgo(32), 0, 'returned', librarian.lastInsertRowid, librarian.lastInsertRowid, 0.0, 0, 'Returned on time');
  const tPaidFine = insertTrans.run(bookIdMap['ACC-1005'], 'ACC-1005-C1', stu2.lastInsertRowid, daysAgo(25), daysAgo(11), daysAgo(10), 0, 'returned', librarian.lastInsertRowid, librarian.lastInsertRowid, 2.0, 1, 'Late return - fine paid');
  insertTrans.run(bookIdMap['ACC-5002'], 'ACC-5002-C1', stu4.lastInsertRowid, daysAgo(40), daysAgo(26), daysAgo(25), 0, 'returned', librarian.lastInsertRowid, librarian.lastInsertRowid, 0.0, 0, 'Returned');
  insertTrans.run(bookIdMap['ACC-2003'], 'ACC-2003-C1', stu5.lastInsertRowid, daysAgo(35), daysAgo(21), daysAgo(20), 0, 'returned', librarian.lastInsertRowid, librarian.lastInsertRowid, 0.0, 0, 'Returned');
  insertTrans.run(bookIdMap['ACC-6001'], 'ACC-6001-C1', stu6.lastInsertRowid, daysAgo(22), daysAgo(8), daysAgo(7), 0, 'returned', librarian.lastInsertRowid, librarian.lastInsertRowid, 0.0, 0, 'Returned');

  // 5. Insert Fines
  const insertFine = db.prepare(`
    INSERT INTO fines (transaction_id, member_id, amount, reason, days_overdue, status, paid_amount, payment_date, collected_by, payment_method, receipt_no)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Unpaid fine for Rohan Gupta (6 days overdue = 12.0)
  insertFine.run(t3.lastInsertRowid, stu3.lastInsertRowid, 12.0, 'Late Return (6 days overdue)', 6, 'unpaid', 0.0, null, null, null, null);

  // Unpaid fine for Kabir Mehta (3 days overdue = 6.0)
  insertFine.run(t4.lastInsertRowid, stu5.lastInsertRowid, 6.0, 'Late Return (3 days overdue)', 3, 'unpaid', 0.0, null, null, null, null);

  // Paid fine historical record
  insertFine.run(tPaidFine.lastInsertRowid, stu2.lastInsertRowid, 2.0, 'Late Return (1 day overdue)', 1, 'paid', 2.0, daysAgo(10), librarian.lastInsertRowid, 'cash', 'REC-2024-001');

  // 6. Insert Reservations
  const insertRes = db.prepare(`
    INSERT INTO reservations (book_id, member_id, reservation_date, expiry_date, status, notified_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Student Aarav Sharma has reserved "Designing Data-Intensive Applications" (0 copies available)
  insertRes.run(bookIdMap['ACC-1003'], stu1.lastInsertRowid, daysAgo(2), daysFromNow(7), 'waiting', null);
  // Student Diya Patel is 2nd in queue for "Designing Data-Intensive Applications"
  insertRes.run(bookIdMap['ACC-1003'], stu2.lastInsertRowid, daysAgo(1), daysFromNow(8), 'waiting', null);

  // 7. Insert Faculty & Student Book Acquisition Suggestions
  const insertSugg = db.prepare(`
    INSERT INTO book_suggestions (member_id, title, author, publisher, isbn, reason, status, librarian_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSugg.run(
    fac1.lastInsertRowid, 'Generative Deep Learning: Teaching Machines to Paint, Write, Compose, and Play',
    'David Foster', "O'Reilly Media", '978-1098134181',
    'Required for Final Year B.Tech Elective CS408 (Generative AI)', 'approved', 'Approved in Library Committee meeting'
  );

  insertSugg.run(
    fac3.lastInsertRowid, 'Designing Embedded Systems with PIC Microcontrollers',
    'Tim Wilmshurst', 'Newnes', '978-0081030141',
    'Recommended textbook for Microcontrollers Lab', 'ordered', 'Purchase order PO-2024-88 sent to supplier'
  );

  insertSugg.run(
    stu1.lastInsertRowid, 'Rust in Action: Systems programming concepts and techniques',
    'Tim McNamara', 'Manning', '978-1617294556',
    'Great book for learning modern low-level systems programming and memory safety', 'pending', ''
  );

  // 8. Insert Gamification Badges
  const insertBadge = db.prepare('INSERT INTO member_badges (member_id, badge_key, awarded_at) VALUES (?, ?, ?)');
  insertBadge.run(stu1.lastInsertRowid, 'first_borrow', daysAgo(30));
  insertBadge.run(stu1.lastInsertRowid, 'bookworm', daysAgo(18));
  insertBadge.run(stu1.lastInsertRowid, 'streak_10', daysAgo(3));

  insertBadge.run(stu5.lastInsertRowid, 'first_borrow', daysAgo(120));
  insertBadge.run(stu5.lastInsertRowid, 'bookworm', daysAgo(90));
  insertBadge.run(stu5.lastInsertRowid, 'genre_explorer', daysAgo(45));
  insertBadge.run(stu5.lastInsertRowid, 'speed_reader', daysAgo(20));

  insertBadge.run(fac2.lastInsertRowid, 'first_borrow', daysAgo(200));
  insertBadge.run(fac2.lastInsertRowid, 'bookworm', daysAgo(150));

  // 9. Insert Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(librarian.lastInsertRowid, 'Prof. S. Ramanujan (LIB001)', 'ISSUE_BOOK', 'transaction', '1', 'Issued "Clean Code" to Aarav Sharma (STU2024001)', '192.168.1.10', daysAgo(9));
  insertAudit.run(librarian.lastInsertRowid, 'Prof. S. Ramanujan (LIB001)', 'COLLECT_FINE', 'fine', '1', 'Collected ₹2.0 late fine from Diya Patel (STU2024002)', '192.168.1.10', daysAgo(10));
  insertAudit.run(admin.lastInsertRowid, 'Admin Librarian (ADMIN001)', 'ADD_BOOK', 'book', 'ACC-2006', 'Added "Designing Machine Learning Systems" (3 copies)', '127.0.0.1', daysAgo(15));
  insertAudit.run(admin.lastInsertRowid, 'Admin Librarian (ADMIN001)', 'UPDATE_SETTINGS', 'setting', 'fine_per_day', 'Updated daily fine rate to ₹2.0', '127.0.0.1', daysAgo(30));
});

seedAll();

console.log('✅ Database successfully seeded!');
console.log('----------------------------------------------------');
console.log('📋 DEFAULT LOGIN CREDENTIALS:');
console.log('   👑 Admin:     Username: ADMIN001  Password: admin127  (Requires reset on 1st login)');
console.log('   📚 Librarian: Username: LIB001    Password: password123');
console.log('   🎓 Faculty:   Username: FAC001    Password: password123');
console.log('   📖 Student:   Username: STU2024001 Password: password123');
console.log('----------------------------------------------------');
