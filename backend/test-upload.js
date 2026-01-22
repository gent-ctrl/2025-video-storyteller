import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function testUpload() {
  try {
    console.log('🧪 Testing upload endpoint...');
    
    const response = await fetch('http://localhost:3000/health');
    const health = await response.json();
    console.log('✅ Backend is healthy:', health);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUpload();



