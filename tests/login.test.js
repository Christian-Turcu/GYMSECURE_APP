const { test, expect } = require('@playwright/test');
const { setup, cleanup } = require('./setup');

// UC-1: Login User Test Cases
test.describe('Login Functionality', () => {
    test.beforeAll(async () => {
        await setup();
    });

    test.afterAll(async () => {
        await cleanup();
    });

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        // Wait for page load
        await page.waitForLoadState('networkidle');
        await page.waitForLoadState('domcontentloaded');
        // Wait for login form to be visible
        await page.waitForSelector('form[action="/login"]', { state: 'visible', timeout: 5000 });
    });

    // Normal Flow Tests
    test('successful login with valid credentials', async ({ page }) => {
        // Wait for form elements
        await page.waitForSelector('#username', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#password', { state: 'visible', timeout: 5000 });
        
        await page.fill('#username', 'testuser');
        await page.fill('#password', 'Password123!');
        await page.click('form[action="/login"] button[type="submit"]');
        
        // Wait for redirect
        await page.waitForURL('**/member/dashboard');
        expect(page.url()).toContain('/member/dashboard');
    });

    // Alternate Flow Tests
    test('failed login with invalid password', async ({ page }) => {
        // Wait for form elements
        await page.waitForSelector('#username', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#password', { state: 'visible', timeout: 5000 });
        
        await page.fill('#username', 'testuser');
        await page.fill('#password', 'wrongpassword');
        await page.click('form[action="/login"] button[type="submit"]');
        
        // Wait for error message
        await page.waitForSelector('.alert-danger', { timeout: 5000 });
        const errorText = await page.locator('.alert-danger').textContent();
        expect(errorText).toContain('Invalid username or password');
    });

    test('form validation for empty fields', async ({ page }) => {
        // Wait for form elements
        await page.waitForSelector('#username', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#password', { state: 'visible', timeout: 5000 });
        
        // Try to submit empty form
        await page.click('form[action="/login"] button[type="submit"]');
        
        // Check for HTML5 validation message
        const usernameInput = await page.locator('#username');
        const passwordInput = await page.locator('#password');
        
        await expect(usernameInput).toHaveAttribute('required', '');
        await expect(passwordInput).toHaveAttribute('required', '');
    });

    // Exception Flow Tests
    test('login attempt with SQL injection', async ({ page }) => {
        // Wait for form elements
        await page.waitForSelector('#username', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#password', { state: 'visible', timeout: 5000 });
        
        await page.fill('#username', "' OR '1'='1");
        await page.fill('#password', "' OR '1'='1");
        await page.click('form[action="/login"] button[type="submit"]');
        
        // Wait for error message
        await page.waitForSelector('.alert-danger', { timeout: 5000 });
        const errorText = await page.locator('.alert-danger').textContent();
        expect(errorText).toContain('Invalid username or password');
    });

    test('login with XSS attempt', async ({ page }) => {
        // Wait for form elements
        await page.waitForSelector('#username', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#password', { state: 'visible', timeout: 5000 });
        
        const xssScript = '<script>alert("xss")</script>';
        await page.fill('#username', xssScript);
        await page.fill('#password', 'Password123!');
        await page.click('form[action="/login"] button[type="submit"]');
        
        // Check that the script is not executed
        const content = await page.content();
        expect(content).not.toContain(xssScript);
        
        // Should see error message
        await page.waitForSelector('.alert-danger', { timeout: 5000 });
        const errorText = await page.locator('.alert-danger').textContent();
        expect(errorText).toContain('Invalid username or password');
    });

    test('rate limiting after multiple failed attempts', async ({ page }) => {
        // Wait for form elements
        await page.waitForSelector('#username', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#password', { state: 'visible', timeout: 5000 });
        
        // Make 6 failed login attempts (rate limit is set to 5)
        for (let i = 0; i < 6; i++) {
            await page.fill('#username', 'testuser');
            await page.fill('#password', 'wrongpassword');
            await page.click('form[action="/login"] button[type="submit"]');
            
            // Wait between attempts to ensure rate limiting takes effect
            await page.waitForTimeout(1000);
            
            // Wait for page to load after each attempt
            await page.waitForLoadState('networkidle');
        }
        
        // The 6th attempt should show rate limit message
        const errorElement = await page.waitForSelector('.alert-danger', { timeout: 5000 });
        const errorText = await errorElement.textContent();
        expect(errorText).toContain('Too many login attempts');
    });
});
