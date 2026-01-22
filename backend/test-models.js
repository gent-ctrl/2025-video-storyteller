import dotenv from 'dotenv';
import { VertexAI } from '@google-cloud/vertexai';

dotenv.config();

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: process.env.GOOGLE_CLOUD_LOCATION,
});

const modelsToTest = [
  'gemini-3-pro',
  'gemini-pro-3',
  'gemini-3.0-pro',
  'gemini-pro-3.0',
  'gemini-3-pro-preview',
  'gemini-3-pro-001',
  'gemini-3-pro-002',
  'gemini-3.0-pro-001',
  'gemini-2.0-flash-exp',
];

async function testModels() {
  console.log('🔍 Testing which Gemini models are available...\n');
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing: ${modelName}...`);
      const model = vertexAI.getGenerativeModel({ model: modelName });
      
      // Try a simple test
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      });
      
      console.log(`✅ ${modelName} - WORKS!\n`);
    } catch (error) {
      console.log(`❌ ${modelName} - ${error.message}\n`);
    }
  }
}

testModels();

