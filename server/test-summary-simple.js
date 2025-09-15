// Simple test to check summary endpoint
async function testSummary() {
  try {
    console.log('Testing summary endpoint...');
    
    const response = await fetch('http://localhost:3001/api/summary?refresh=true');
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSummary();