import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_USER_ID = 'test-user-123';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  data?: any;
}

const results: TestResult[] = [];

/**
 * Create a test PDF file
 */
function createTestPDF(): string {
  const PDFDocument = require('pdfkit');
  const testPdfPath = path.join(__dirname, '../../uploads/test-document.pdf');
  
  // Ensure uploads directory exists
  const uploadsDir = path.dirname(testPdfPath);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(testPdfPath);
    
    doc.pipe(writeStream);

    // Create a multi-page test document
    for (let i = 1; i <= 20; i++) {
      if (i > 1) doc.addPage();
      
      doc
        .fontSize(24)
        .text(`Page ${i}`, { align: 'center' })
        .moveDown();
      
      doc
        .fontSize(12)
        .text(`This is page ${i} of the test document.`, { align: 'left' })
        .moveDown();
      
      doc
        .fontSize(10)
        .text(
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
          'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
          'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
          { align: 'justify' }
        );
    }

    doc.end();

    writeStream.on('finish', () => {
      console.log('✓ Test PDF created:', testPdfPath);
      resolve(testPdfPath);
    });

    writeStream.on('error', reject);
  });
}

/**
 * Test 1: Upload PDF file
 */
async function testUploadPDF(pdfPath: string): Promise<string | null> {
  try {
    console.log('\n📤 Test 1: Upload PDF file...');

    const formData = new FormData();
    formData.append('file', fs.createReadStream(pdfPath));
    formData.append('userId', TEST_USER_ID);
    formData.append('filetype', 'application/pdf');

    const response = await axios.post(
      `${API_BASE_URL}/api/v1/upload`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    if (response.data.success && response.data.data.uploadId) {
      results.push({
        test: 'Upload PDF',
        status: 'PASS',
        message: 'PDF uploaded successfully',
        data: { uploadId: response.data.data.uploadId },
      });
      console.log('✓ Upload successful:', response.data.data.uploadId);
      return response.data.data.uploadId;
    } else {
      throw new Error('Upload failed');
    }
  } catch (error: any) {
    results.push({
      test: 'Upload PDF',
      status: 'FAIL',
      message: error.message,
    });
    console.error('✗ Upload failed:', error.message);
    return null;
  }
}

/**
 * Test 2: Generate PDF preview
 */
async function testGeneratePreview(uploadId: string): Promise<boolean> {
  try {
    console.log('\n🎨 Test 2: Generate PDF preview...');

    const response = await axios.post(
      `${API_BASE_URL}/api/v1/preview/pdf/generate`,
      {
        uploadId,
        userId: TEST_USER_ID,
        previewPercentage: 10,
        watermarkOpacity: 0.3,
      }
    );

    if (response.data.success) {
      results.push({
        test: 'Generate Preview',
        status: 'PASS',
        message: 'Preview generated successfully',
        data: response.data.data,
      });
      console.log('✓ Preview generated:', response.data.data);
      return true;
    } else {
      throw new Error('Preview generation failed');
    }
  } catch (error: any) {
    results.push({
      test: 'Generate Preview',
      status: 'FAIL',
      message: error.message,
    });
    console.error('✗ Preview generation failed:', error.message);
    return false;
  }
}

/**
 * Test 3: View PDF preview
 */
async function testViewPreview(uploadId: string): Promise<boolean> {
  try {
    console.log('\n👁️  Test 3: View PDF preview...');

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/preview/pdf/${uploadId}`,
      {
        responseType: 'arraybuffer',
      }
    );

    if (response.status === 200 && response.headers['content-type'] === 'application/pdf') {
      // Check for download prevention headers
      const hasInlineDisposition = response.headers['content-disposition']?.includes('inline');
      const hasNoCache = response.headers['cache-control']?.includes('no-cache');
      
      results.push({
        test: 'View Preview',
        status: 'PASS',
        message: 'Preview viewed successfully',
        data: {
          size: response.data.byteLength,
          contentType: response.headers['content-type'],
          disposition: response.headers['content-disposition'],
          hasInlineDisposition,
          hasNoCache,
        },
      });
      console.log('✓ Preview viewed successfully');
      console.log('  - Size:', response.data.byteLength, 'bytes');
      console.log('  - Inline disposition:', hasInlineDisposition);
      console.log('  - No-cache header:', hasNoCache);
      return true;
    } else {
      throw new Error('Invalid preview response');
    }
  } catch (error: any) {
    results.push({
      test: 'View Preview',
      status: 'FAIL',
      message: error.message,
    });
    console.error('✗ View preview failed:', error.message);
    return false;
  }
}

/**
 * Test 4: Get preview analytics
 */
async function testGetAnalytics(uploadId: string): Promise<boolean> {
  try {
    console.log('\n📊 Test 4: Get preview analytics...');

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/preview/pdf/analytics/${uploadId}`,
      {
        headers: {
          'x-user-id': TEST_USER_ID,
        },
      }
    );

    if (response.data.success) {
      results.push({
        test: 'Get Analytics',
        status: 'PASS',
        message: 'Analytics retrieved successfully',
        data: response.data.data,
      });
      console.log('✓ Analytics retrieved:', response.data.data);
      return true;
    } else {
      throw new Error('Analytics retrieval failed');
    }
  } catch (error: any) {
    results.push({
      test: 'Get Analytics',
      status: 'FAIL',
      message: error.message,
    });
    console.error('✗ Analytics retrieval failed:', error.message);
    return false;
  }
}

/**
 * Test 5: Delete preview
 */
async function testDeletePreview(uploadId: string): Promise<boolean> {
  try {
    console.log('\n🗑️  Test 5: Delete preview...');

    const response = await axios.delete(
      `${API_BASE_URL}/api/v1/preview/pdf/${uploadId}`,
      {
        headers: {
          'x-user-id': TEST_USER_ID,
        },
      }
    );

    if (response.data.success) {
      results.push({
        test: 'Delete Preview',
        status: 'PASS',
        message: 'Preview deleted successfully',
      });
      console.log('✓ Preview deleted successfully');
      return true;
    } else {
      throw new Error('Preview deletion failed');
    }
  } catch (error: any) {
    results.push({
      test: 'Delete Preview',
      status: 'FAIL',
      message: error.message,
    });
    console.error('✗ Preview deletion failed:', error.message);
    return false;
  }
}

/**
 * Print test results summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  results.forEach((result) => {
    const icon = result.status === 'PASS' ? '✓' : '✗';
    console.log(`${icon} ${result.test}: ${result.status} - ${result.message}`);
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please check the logs above.');
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting PDF Preview Integration Tests...\n');

  try {
    // Create test PDF
    const pdfPath = await createTestPDF();

    // Test 1: Upload PDF
    const uploadId = await testUploadPDF(pdfPath);
    if (!uploadId) {
      console.error('Cannot continue tests without upload ID');
      printSummary();
      process.exit(1);
    }

    // Test 2: Generate preview
    const previewGenerated = await testGeneratePreview(uploadId);
    if (!previewGenerated) {
      console.error('Cannot continue tests without preview');
      printSummary();
      process.exit(1);
    }

    // Test 3: View preview
    await testViewPreview(uploadId);

    // Test 4: Get analytics
    await testGetAnalytics(uploadId);

    // Test 5: Delete preview
    await testDeletePreview(uploadId);

    // Print summary
    printSummary();

    // Exit with appropriate code
    const failed = results.filter((r) => r.status === 'FAIL').length;
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test runner error:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
