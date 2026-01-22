import dotenv from 'dotenv';
import { VertexAI } from '@google-cloud/vertexai';

dotenv.config();

const regions = ['us-central1', 'us-east4', 'europe-west1', 'asia-southeast1'];
const modelName = 'gemini-3-pro';

async function testRegions() {
  console.log('🌍 Testing Gemini 3 Pro availability across regions...\n');
  
  for (const region of regions) {
    try {
      console.log(`Testing ${region}...`);
      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT_ID,
        location: region,
      });
      
      const model = vertexAI.getGenerativeModel({ model: modelName });
      await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      });
      
      console.log(`✅ ${region} - Gemini 3 Pro AVAILABLE!\n`);
      return;
    } catch (error) {
      console.log(`❌ ${region} - Not available\n`);
    }
  }
  
  console.log('❌ Gemini 3 Pro not available in any tested region');
}

testRegions();



