import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';

dotenv.config();

async function testGCS() {
  try {
    console.log('🔍 Testing Google Cloud Storage connection...');
    console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    console.log('Bucket:', process.env.GCS_BUCKET_NAME);
    console.log('Key file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });

    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    
    console.log('\n✅ Storage client initialized');
    
    // Try to check if bucket exists
    const [exists] = await bucket.exists();
    
    if (exists) {
      console.log('✅ Bucket exists and is accessible!');
      console.log('\n🎉 Google Cloud Storage is working correctly!');
    } else {
      console.log('❌ Bucket does not exist or is not accessible');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  }
}

testGCS();



