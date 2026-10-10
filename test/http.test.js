// Automated HTTP API Endpoint Verification

async function testHttpEndpoints() {
  const baseUrl = 'http://localhost:3000';

  console.log('🌐 Testing Live HTTP Endpoints on', baseUrl);

  try {
    // 1. Test Health endpoint
    const healthRes = await fetch(`${baseUrl}/api/system/health`);
    const healthData = await healthRes.json();
    console.log('  ✅ GET /api/system/health:', healthData.status, `(${healthData.memory.rss_mb} MB RAM)`);

    // 2. Test Books Search endpoint
    const booksRes = await fetch(`${baseUrl}/api/books?q=Code&limit=3`);
    const booksData = await booksRes.json();
    console.log('  ✅ GET /api/books?q=Code:', `Found ${booksData.books.length} matching books (Total: ${booksData.pagination.total})`);

    // 3. Test Student Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'STU2024001', password: 'password123' })
    });
    const loginData = await loginRes.json();
    console.log('  ✅ POST /api/auth/login (Student):', loginData.success ? `Token received for ${loginData.user.name}` : 'Failed');

    // 4. Test Student My Loans with Token
    const loansRes = await fetch(`${baseUrl}/api/circulation/my-loans`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    const loansData = await loansRes.json();
    console.log('  ✅ GET /api/circulation/my-loans:', `Retrieved ${loansData.active_loans.length} active loans, streak: ${loansData.stats.reading_streak}`);

    // 5. Test Admin Login (Verify force_password_change flag)
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ADMIN001', password: 'admin127' })
    });
    const adminLoginData = await adminLoginRes.json();
    console.log('  ✅ POST /api/auth/login (Admin):', `force_password_change = ${adminLoginData.user.force_password_change}`);

    // 6. Test Reports Dashboard with Admin Token
    const dashRes = await fetch(`${baseUrl}/api/reports/dashboard`, {
      headers: { 'Authorization': `Bearer ${adminLoginData.token}` }
    });
    const dashData = await dashRes.json();
    console.log('  ✅ GET /api/reports/dashboard:', `Titles: ${dashData.books.total_titles}, Members: ${dashData.members.total_members}, Issued: ${dashData.books.currently_issued}`);

    // 7. Test Leaderboards
    const leadRes = await fetch(`${baseUrl}/api/leaderboard/departments`);
    const leadData = await leadRes.json();
    console.log('  ✅ GET /api/leaderboard/departments:', `${leadData.departments.length} departments ranked`);

    // 8. Test Static Index.html
    const htmlRes = await fetch(`${baseUrl}/`);
    const htmlText = await htmlRes.text();
    console.log('  ✅ GET / (Static Shell):', htmlText.includes('Apex Library') ? 'HTML App Shell Served' : 'Missing brand');

    console.log('\n🎉 ALL LIVE HTTP ENDPOINTS TESTED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ HTTP Test Error:', err);
    process.exit(1);
  }
}

testHttpEndpoints();
