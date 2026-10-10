// End-to-End Circulation Simulation Test

async function testCirculationCycle() {
  const baseUrl = 'http://localhost:3000';
  console.log('🔄 Running end-to-end circulation lifecycle test...');

  // 1. Librarian Login
  const libLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'LIB001', password: 'password123' })
  });
  const libAuth = await libLoginRes.json();
  const token = libAuth.token;
  console.log('  1. Librarian logged in:', libAuth.user.name);

  // 2. Lookup Scan Member
  const scanMemRes = await fetch(`${baseUrl}/api/circulation/lookup-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ code: 'STU2024004' }) // Ananya Singh
  });
  const memData = await scanMemRes.json();
  console.log('  2. Member scan result:', memData.data.name, `(Active loans: ${memData.data.active_loans_count})`);

  // 3. Lookup Scan Book Copy
  const scanBookRes = await fetch(`${baseUrl}/api/circulation/lookup-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ code: 'ACC-1004-C2' }) // The C Programming Language
  });
  const bookData = await scanBookRes.json();
  console.log('  3. Book copy scan result:', bookData.data.copy.title, `(${bookData.data.copy.barcode})`);

  // 4. Issue Book to Member
  const issueRes = await fetch(`${baseUrl}/api/circulation/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ memberId: memData.data.id, copyBarcode: 'ACC-1004-C2' })
  });
  const issueData = await issueRes.json();
  console.log('  4. Issue result:', issueData.message);

  // 5. Return Book
  const returnRes = await fetch(`${baseUrl}/api/circulation/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ copyBarcode: 'ACC-1004-C2' })
  });
  const returnData = await returnRes.json();
  console.log('  5. Return result:', returnData.message, `(Confetti trigger: ${returnData.confetti})`);

  // 6. Test Hot Backup
  const backupRes = await fetch(`${baseUrl}/api/system/backup`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const backupData = await backupRes.json();
  console.log('  6. Hot backup snapshot created:', backupData.backup.filename);

  console.log('\n🎉 ALL CIRCULATION SIMULATION STEPS COMPLETED SMOOTHLY!\n');
}

testCirculationCycle();
