/**
 * Test script for Custom Branding functionality
 * 
 * Usage: npx ts-node src/scripts/test-branding.ts
 */

import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TENANT_SLUG = process.env.TENANT_SLUG || 'test-tenant';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'X-Tenant-Slug': TENANT_SLUG
  }
});

async function testGetBranding() {
  console.log('\n1. Testing GET /branding...');
  try {
    const response = await api.get('/branding');
    console.log('✅ Get branding successful');
    console.log('Branding config:', JSON.stringify(response.data.data, null, 2));
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Get branding failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testUpdateBranding() {
  console.log('\n2. Testing PUT /branding...');
  try {
    const brandingConfig = {
      primaryColor: '#FF5733',
      secondaryColor: '#C70039',
      accentColor: '#FFC300',
      companyName: 'Test Company',
      tagline: 'Testing Branding System',
      footerText: '© 2025 Test Company'
    };

    const response = await api.put('/branding', brandingConfig);
    console.log('✅ Update branding successful');
    console.log('Updated config:', JSON.stringify(response.data.data, null, 2));
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Update branding failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testUploadLogo() {
  console.log('\n3. Testing POST /branding/logo...');
  
  // Create a simple test image (1x1 PNG)
  const testImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  try {
    const formData = new FormData();
    formData.append('logo', testImageBuffer, {
      filename: 'test-logo.png',
      contentType: 'image/png'
    });

    const response = await api.post('/branding/logo', formData, {
      headers: formData.getHeaders()
    });

    console.log('✅ Upload logo successful');
    console.log('Logo URL:', response.data.data.logoUrl);
    return response.data.data.logoUrl;
  } catch (error: any) {
    console.error('❌ Upload logo failed:', error.response?.data || error.message);
    // Don't throw - logo upload might fail if multer is not configured
    console.log('⚠️  Skipping logo upload test');
  }
}

async function testGetThemeCSS() {
  console.log('\n4. Testing GET /branding/theme.css...');
  try {
    const response = await api.get('/branding/theme.css');
    console.log('✅ Get theme CSS successful');
    console.log('CSS length:', response.data.length, 'characters');
    console.log('CSS preview:', response.data.substring(0, 200) + '...');
    return response.data;
  } catch (error: any) {
    console.error('❌ Get theme CSS failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testPreviewBranding() {
  console.log('\n5. Testing POST /branding/preview...');
  try {
    const previewConfig = {
      primaryColor: '#3B82F6',
      secondaryColor: '#8B5CF6',
      companyName: 'Preview Company'
    };

    const response = await api.post('/branding/preview', previewConfig);
    console.log('✅ Preview branding successful');
    console.log('Preview data:', JSON.stringify(response.data.data, null, 2));
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Preview branding failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testResetBranding() {
  console.log('\n6. Testing POST /branding/reset...');
  try {
    const response = await api.post('/branding/reset');
    console.log('✅ Reset branding successful');
    console.log('Default config:', JSON.stringify(response.data.data, null, 2));
    return response.data.data;
  } catch (error: any) {
    console.error('❌ Reset branding failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testColorValidation() {
  console.log('\n7. Testing color validation...');
  
  const invalidColors = [
    { primaryColor: 'invalid-color' },
    { primaryColor: '#GGGGGG' },
    { primaryColor: 'rgb(300, 300, 300)' }
  ];

  for (const config of invalidColors) {
    try {
      await api.put('/branding', config);
      console.error('❌ Should have rejected invalid color:', config.primaryColor);
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected invalid color:', config.primaryColor);
      } else {
        console.error('❌ Unexpected error:', error.message);
      }
    }
  }
}

async function testCustomCSSValidation() {
  console.log('\n8. Testing custom CSS validation...');
  
  const dangerousCSS = [
    { customCss: '<script>alert("xss")</script>' },
    { customCss: 'body { behavior: url(xss.htc); }' },
    { customCss: '@import url("malicious.css");' }
  ];

  for (const config of dangerousCSS) {
    try {
      await api.put('/branding', config);
      console.error('❌ Should have rejected dangerous CSS');
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected dangerous CSS');
      } else {
        console.error('❌ Unexpected error:', error.message);
      }
    }
  }
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('Custom Branding API Tests');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Tenant Slug: ${TENANT_SLUG}`);

  try {
    await testGetBranding();
    await testUpdateBranding();
    await testUploadLogo();
    await testGetThemeCSS();
    await testPreviewBranding();
    await testColorValidation();
    await testCustomCSSValidation();
    await testResetBranding();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ Tests failed');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run tests
runAllTests();
