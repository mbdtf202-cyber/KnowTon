import axios from 'axios'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1'

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  duration?: number
}

const results: TestResult[] = []

async function runTest(
  testName: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now()
  try {
    await testFn()
    const duration = Date.now() - startTime
    results.push({
      test: testName,
      status: 'PASS',
      message: 'Test passed successfully',
      duration,
    })
    console.log(`✅ ${testName} (${duration}ms)`)
  } catch (error: any) {
    const duration = Date.now() - startTime
    results.push({
      test: testName,
      status: 'FAIL',
      message: error.message || 'Test failed',
      duration,
    })
    console.error(`❌ ${testName} (${duration}ms):`, error.message)
  }
}

async function testGetSSOProviders(): Promise<void> {
  const response = await axios.get(`${API_BASE_URL}/auth/sso/providers`)

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`)
  }

  if (!response.data.success) {
    throw new Error('Expected success: true')
  }

  if (!response.data.providers) {
    throw new Error('Expected providers object')
  }

  if (!Array.isArray(response.data.providers.oauth2)) {
    throw new Error('Expected oauth2 providers array')
  }

  if (!Array.isArray(response.data.providers.saml)) {
    throw new Error('Expected saml providers array')
  }

  console.log('  Configured OAuth2 providers:', response.data.providers.oauth2)
  console.log('  Configured SAML providers:', response.data.providers.saml)
}

async function testOAuth2GoogleAuthorize(): Promise<void> {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/auth/sso/oauth2/google/authorize`,
      {
        maxRedirects: 0,
        validateStatus: (status) => status === 302 || status === 400,
      }
    )

    if (response.status === 400) {
      // Provider not configured - this is expected in test environment
      console.log('  Google OAuth2 not configured (expected in test)')
      results[results.length - 1].status = 'SKIP'
      results[results.length - 1].message = 'Provider not configured'
      return
    }

    if (response.status !== 302) {
      throw new Error(`Expected redirect (302), got ${response.status}`)
    }

    const location = response.headers.location
    if (!location || !location.includes('accounts.google.com')) {
      throw new Error('Expected redirect to Google OAuth2')
    }

    console.log('  Redirect URL:', location.substring(0, 100) + '...')
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('  Google OAuth2 not configured (expected in test)')
      results[results.length - 1].status = 'SKIP'
      results[results.length - 1].message = 'Provider not configured'
      return
    }
    throw error
  }
}

async function testOAuth2MicrosoftAuthorize(): Promise<void> {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/auth/sso/oauth2/microsoft/authorize`,
      {
        maxRedirects: 0,
        validateStatus: (status) => status === 302 || status === 400,
      }
    )

    if (response.status === 400) {
      console.log('  Microsoft OAuth2 not configured (expected in test)')
      results[results.length - 1].status = 'SKIP'
      results[results.length - 1].message = 'Provider not configured'
      return
    }

    if (response.status !== 302) {
      throw new Error(`Expected redirect (302), got ${response.status}`)
    }

    const location = response.headers.location
    if (!location || !location.includes('login.microsoftonline.com')) {
      throw new Error('Expected redirect to Microsoft OAuth2')
    }

    console.log('  Redirect URL:', location.substring(0, 100) + '...')
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('  Microsoft OAuth2 not configured (expected in test)')
      results[results.length - 1].status = 'SKIP'
      results[results.length - 1].message = 'Provider not configured'
      return
    }
    throw error
  }
}

async function testOAuth2OktaAuthorize(): Promise<void> {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/auth/sso/oauth2/okta/authorize`,
      {
        maxRedirects: 0,
        validateStatus: (status) => status === 302 || status === 400,
      }
    )

    if (response.status === 400) {
      console.log('  Okta OAuth2 not configured (expected in test)')
      results[results.length - 1].status = 'SKIP'
      results[results.length - 1].message = 'Provider not configured'
      return
    }

    if (response.status !== 302) {
      throw new Error(`Expected redirect (302), got ${response.status}`)
    }

    const location = response.headers.location
    if (!location || !location.includes('oauth2/v1/authorize')) {
      throw new Error('Expected redirect to Okta OAuth2')
    }

    console.log('  Redirect URL:', location.substring(0, 100) + '...')
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('  Okta OAuth2 not configured (expected in test)')
      results[results.length - 1].status = 'SKIP'
      results[results.length - 1].message = 'Provider not configured'
      return
    }
    throw error
  }
}

async function testSAMLLogin(): Promise<void> {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/auth/sso/saml/default/login`,
      {
        maxRedirects: 0,
        validateStatus: (status) => status === 302 || status === 400,
      }
    )

    if (response.status === 400) {
      console.log('  SAML not configured (expected in test)')
      results[results.length - 1].status = 'SKIP'
      results[results.length - 1].message = 'Provider not configured'
      return
    }

    if (response.status !== 302) {
      throw new Error(`Expected redirect (302), got ${response.status}`)
    }

    const location = response.headers.location
    if (!location || !location.includes('SAMLRequest')) {
      throw new Error('Expected SAML request in redirect URL')
    }

    console.log('  SAML Request URL:', location.substring(0, 100) + '...')
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('  SAML not configured (expected in test)')
      results[results.length - 1].status = 'SKIP'
      results[results.length - 1].message = 'Provider not configured'
      return
    }
    throw error
  }
}

async function testSAMLMetadata(): Promise<void> {
  const response = await axios.get(`${API_BASE_URL}/auth/sso/saml/metadata`)

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`)
  }

  if (!response.data.includes('EntityDescriptor')) {
    throw new Error('Expected SAML metadata XML')
  }

  if (!response.data.includes('SPSSODescriptor')) {
    throw new Error('Expected SP SSO descriptor in metadata')
  }

  console.log('  SAML metadata generated successfully')
}

async function testProvisionUser(): Promise<void> {
  const testEmail = `test-sso-${Date.now()}@example.com`

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/sso/provision`, {
      email: testEmail,
      provider: 'google',
      externalId: 'test-external-id-123',
      type: 'oauth2',
    })

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`)
    }

    if (!response.data.success) {
      throw new Error('Expected success: true')
    }

    if (!response.data.user) {
      throw new Error('Expected user object')
    }

    if (response.data.user.email !== testEmail) {
      throw new Error('User email mismatch')
    }

    console.log('  User provisioned:', response.data.user.id)

    // Clean up - deprovision the test user
    await axios.post(`${API_BASE_URL}/auth/sso/deprovision`, {
      userId: response.data.user.id,
    })

    console.log('  Test user deprovisioned')
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('  Provisioning requires admin auth (expected)')
      results[results.length - 1].status = 'SKIP'
      results[results.length - 1].message = 'Requires admin authentication'
      return
    }
    throw error
  }
}

async function testInvalidProvider(): Promise<void> {
  try {
    await axios.get(`${API_BASE_URL}/auth/sso/oauth2/invalid-provider/authorize`, {
      maxRedirects: 0,
      validateStatus: () => true,
    })

    const response = await axios.get(
      `${API_BASE_URL}/auth/sso/oauth2/invalid-provider/authorize`,
      {
        validateStatus: () => true,
      }
    )

    if (response.status !== 400) {
      throw new Error(`Expected status 400 for invalid provider, got ${response.status}`)
    }

    console.log('  Invalid provider correctly rejected')
  } catch (error: any) {
    throw error
  }
}

async function main(): Promise<void> {
  console.log('🧪 Starting SSO Integration Tests\n')
  console.log(`API Base URL: ${API_BASE_URL}\n`)

  // Test 1: Get SSO Providers
  await runTest('Get SSO Providers', testGetSSOProviders)

  // Test 2: OAuth2 Google Authorization
  await runTest('OAuth2 Google Authorization', testOAuth2GoogleAuthorize)

  // Test 3: OAuth2 Microsoft Authorization
  await runTest('OAuth2 Microsoft Authorization', testOAuth2MicrosoftAuthorize)

  // Test 4: OAuth2 Okta Authorization
  await runTest('OAuth2 Okta Authorization', testOAuth2OktaAuthorize)

  // Test 5: SAML Login
  await runTest('SAML Login', testSAMLLogin)

  // Test 6: SAML Metadata
  await runTest('SAML Metadata', testSAMLMetadata)

  // Test 7: Provision User
  await runTest('Provision User', testProvisionUser)

  // Test 8: Invalid Provider
  await runTest('Invalid Provider Rejection', testInvalidProvider)

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Summary')
  console.log('='.repeat(60))

  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  const skipped = results.filter((r) => r.status === 'SKIP').length
  const total = results.length

  console.log(`Total Tests: ${total}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏭️  Skipped: ${skipped}`)

  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`  - ${r.test}: ${r.message}`)
      })
  }

  if (skipped > 0) {
    console.log('\n⏭️  Skipped Tests:')
    results
      .filter((r) => r.status === 'SKIP')
      .forEach((r) => {
        console.log(`  - ${r.test}: ${r.message}`)
      })
  }

  console.log('\n' + '='.repeat(60))

  // Exit with error code if any tests failed
  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Test execution failed:', error)
  process.exit(1)
})
