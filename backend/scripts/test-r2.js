const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS SDK for Cloudflare R2
AWS.config.update({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: 'auto'
});

// Create S3-compatible instance for Cloudflare R2
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
  endpoint: process.env.R2_ENDPOINT,
  s3ForcePathStyle: true
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

async function testR2Connection() {
  try {
    console.log('🔍 Testing Cloudflare R2 connection...');
    console.log(`📦 Bucket: ${BUCKET_NAME}`);
    console.log(`🌐 Endpoint: ${process.env.R2_ENDPOINT}`);
    
    // Test 1: List objects in bucket
    console.log('\n📋 Test 1: Listing objects in bucket...');
    const listParams = {
      Bucket: BUCKET_NAME,
      MaxKeys: 5
    };
    
    const listResult = await s3.listObjectsV2(listParams).promise();
    console.log(`✅ Successfully listed objects. Found ${listResult.Contents?.length || 0} objects.`);
    
    if (listResult.Contents && listResult.Contents.length > 0) {
      console.log('📁 Sample objects:');
      listResult.Contents.slice(0, 3).forEach((obj, index) => {
        console.log(`   ${index + 1}. ${obj.Key} (${obj.Size} bytes, ${obj.LastModified})`);
      });
    }
    
    // Test 2: Upload a test file
    console.log('\n📤 Test 2: Uploading test file...');
    const testContent = `Test file created at ${new Date().toISOString()}`;
    const testKey = `test/connection-test-${Date.now()}.txt`;
    
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    };
    
    const uploadResult = await s3.upload(uploadParams).promise();
    console.log(`✅ Successfully uploaded test file: ${uploadResult.Location}`);
    
    // Test 3: Download the test file
    console.log('\n📥 Test 3: Downloading test file...');
    const downloadParams = {
      Bucket: BUCKET_NAME,
      Key: testKey
    };
    
    const downloadResult = await s3.getObject(downloadParams).promise();
    const downloadedContent = downloadResult.Body.toString();
    console.log(`✅ Successfully downloaded test file. Content: "${downloadedContent}"`);
    
    // Test 4: Delete the test file
    console.log('\n🗑️  Test 4: Deleting test file...');
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: testKey
    };
    
    await s3.deleteObject(deleteParams).promise();
    console.log('✅ Successfully deleted test file.');
    
    // Test 5: Generate presigned URL
    console.log('\n🔗 Test 5: Generating presigned URL...');
    const presignedParams = {
      Bucket: BUCKET_NAME,
      Key: 'test/presigned-test.txt',
      Expires: 3600
    };
    
    const presignedUrl = s3.getSignedUrl('getObject', presignedParams);
    console.log(`✅ Successfully generated presigned URL: ${presignedUrl.substring(0, 100)}...`);
    
    console.log('\n🎉 All R2 connection tests passed successfully!');
    console.log('✅ Your Cloudflare R2 configuration is working correctly.');
    
  } catch (error) {
    console.error('\n❌ R2 connection test failed:');
    console.error(`Error: ${error.message}`);
    
    if (error.code === 'NoSuchBucket') {
      console.error('\n💡 The bucket does not exist. Please create the bucket in Cloudflare R2 dashboard.');
    } else if (error.code === 'AccessDenied') {
      console.error('\n💡 Access denied. Please check your R2 credentials and permissions.');
    } else if (error.code === 'InvalidAccessKeyId') {
      console.error('\n💡 Invalid access key. Please check your R2_ACCESS_KEY_ID.');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('\n💡 Invalid secret key. Please check your R2_SECRET_ACCESS_KEY.');
    }
    
    process.exit(1);
  }
}

// Run the test
testR2Connection();
