const { test, expect } = require('@playwright/test');
const { setup, cleanup } = require('./setup');

test.describe('Registration Functionality', () => {
    test.beforeAll(async () => {
        await setup();
    });

    test.afterAll(async () => {
        await cleanup();
    });

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');  // Registration form is on login page
        await page.waitForLoadState('networkidle');
        await page.waitForLoadState('domcontentloaded');
        // Wait for registration form to be visible
        await page.waitForSelector('form[action="/register"]', { state: 'visible', timeout: 5000 });
    });

    test('successful registration with valid data', async ({ page }) => {
        // Wait for form elements
        await page.waitForSelector('#newUsername', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#email', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#newPassword', { state: 'visible', timeout: 5000 });
        
        // Generate unique username and email
        const timestamp = Date.now();
        const username = `newuser${timestamp}`;
        const email = `newuser${timestamp}@test.com`;
        
        await page.fill('#newUsername', username);
        await page.fill('#email', email);
        await page.fill('#newPassword', 'Password123!');
        await page.click('form[action="/register"] button[type="submit"]');
        
        // Wait for success message
        await page.waitForLoadState('networkidle');
        const successElement = await page.waitForSelector('.alert-success', { timeout: 5000 });
        const successText = await successElement.textContent();
        expect(successText).toContain('Registration successful');
    });

    test('duplicate email handling', async ({ page }) => {
        // Wait for form elements
        await page.waitForSelector('#newUsername', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#email', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#newPassword', { state: 'visible', timeout: 5000 });
        
        await page.fill('#newUsername', 'user2');
        await page.fill('#email', 'test@example.com'); // Using email from setup.js
        await page.fill('#newPassword', 'Password123!');
        await page.click('form[action="/register"] button[type="submit"]');

        await page.waitForSelector('.alert-danger', { timeout: 5000 });
        const errorMessage = await page.locator('.alert-danger');
        await expect(errorMessage).toContainText(/email.*exists/i);
    });

    test('password strength requirements', async ({ page }) => {
        // Wait for form elements
        await page.waitForSelector('#newUsername', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#email', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#newPassword', { state: 'visible', timeout: 5000 });
        
        await page.fill('#newUsername', 'testuser');
        await page.fill('#email', 'test2@test.com');
        await page.fill('#newPassword', 'weak');
        await page.click('form[action="/register"] button[type="submit"]');

        // Check HTML5 validation
        const passwordInput = await page.locator('#newPassword');
        const isValid = await passwordInput.evaluate(el => el.validity.valid);
        expect(isValid).toBeFalsy();
    });

    test('invalid email format handling', async ({ page }) => {
        // Wait for form elements
        await page.waitForSelector('#newUsername', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#email', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#newPassword', { state: 'visible', timeout: 5000 });
        
        await page.fill('#newUsername', 'testuser');
        await page.fill('#email', 'invalid-email');
        await page.fill('#newPassword', 'Password123!');
        await page.click('form[action="/register"] button[type="submit"]');

        // Check HTML5 validation
        const emailInput = await page.locator('#email');
        const isValid = await emailInput.evaluate(el => el.validity.valid);
        expect(isValid).toBeFalsy();
    });

    test('XSS prevention in registration fields', async ({ page }) => {
        // Wait for form elements
        await page.waitForSelector('#newUsername', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#email', { state: 'visible', timeout: 5000 });
        await page.waitForSelector('#newPassword', { state: 'visible', timeout: 5000 });
        
        const xssScript = '<script>alert("xss")</script>';
        await page.fill('#newUsername', xssScript);
        await page.fill('#email', 'test3@test.com');
        await page.fill('#newPassword', 'Password123!');
        await page.click('form[action="/register"] button[type="submit"]');

        const content = await page.content();
        expect(content).not.toContain(xssScript);
    });
});
