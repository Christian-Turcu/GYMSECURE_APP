const { test, expect } = require('@playwright/test');
const { setup, cleanup } = require('./setup');

test.describe('Performance and Security Tests', () => {
    test.beforeAll(async () => {
        await setup();
    });

    test.afterAll(async () => {
        await cleanup();
    });

    test('page load performance', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await page.waitForLoadState('domcontentloaded');
        
        // Wait for form to be visible to ensure page is fully loaded
        await page.waitForSelector('form[action="/login"]', { timeout: 5000 });
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(5000); // Allow up to 5 seconds for load
    });

    test('responsive design - mobile view', async ({ page }) => {
        // Set viewport to mobile size
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await page.waitForLoadState('domcontentloaded');
        
        // Check if login form is properly visible
        await page.waitForSelector('form[action="/login"]', { timeout: 5000 });
        const loginForm = await page.locator('form[action="/login"]');
        await expect(loginForm).toBeVisible();

        // Check no horizontal scroll
        const bodyWidth = await page.evaluate(() => {
            return document.body.scrollWidth <= window.innerWidth;
        });
        expect(bodyWidth).toBeTruthy();
    });

    test('security headers', async ({ page }) => {
        const response = await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await page.waitForLoadState('domcontentloaded');
        const headers = response.headers();
        
        // Check security headers
        expect(headers['x-frame-options']).toBeTruthy();
        expect(headers['content-security-policy']).toBeTruthy();
        expect(headers['x-content-type-options']).toBe('nosniff');
    });

    test('accessibility - ARIA labels', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await page.waitForLoadState('domcontentloaded');
        
        // Check for proper ARIA labels
        await page.waitForSelector('#username', { timeout: 5000 });
        const usernameInput = await page.locator('#username');
        await expect(usernameInput).toBeVisible();
        expect(await usernameInput.getAttribute('aria-label')).toBeTruthy();

        // Check for form role
        const form = await page.locator('form[action="/login"]');
        expect(await form.getAttribute('role')).toBe('form');
    });

    test('performance metrics', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await page.waitForLoadState('domcontentloaded');
        
        // Wait for form to be visible to ensure page is fully loaded
        await page.waitForSelector('form[action="/login"]', { timeout: 5000 });
        
        // Get performance metrics using Navigation Timing API
        const metrics = await page.evaluate(() => {
            const perf = window.performance;
            const timing = perf.timing || perf.getEntriesByType('navigation')[0];
            
            if (!timing) {
                return {
                    loadTime: 0,
                    renderTime: 0
                };
            }
            
            let loadTime = 0;
            let renderTime = 0;
            
            try {
                if (timing.loadEventEnd && timing.navigationStart) {
                    loadTime = timing.loadEventEnd - timing.navigationStart;
                }
                if (timing.domComplete && timing.domLoading) {
                    renderTime = timing.domComplete - timing.domLoading;
                }
            } catch (error) {
                console.error('Error calculating metrics:', error);
            }
            
            return {
                loadTime: loadTime || 0,
                renderTime: renderTime || 0
            };
        });
        
        // Check performance thresholds
        expect(metrics.loadTime).toBeGreaterThan(0);
        expect(metrics.loadTime).toBeLessThan(5000); // Allow up to 5 seconds for load
        expect(metrics.renderTime).toBeGreaterThan(0);
        expect(metrics.renderTime).toBeLessThan(3000); // Allow up to 3 seconds for render
    });

    test('memory usage', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await page.waitForLoadState('domcontentloaded');
        
        // Wait for form to be visible to ensure page is fully loaded
        await page.waitForSelector('form[action="/login"]', { timeout: 5000 });
        
        // Get memory metrics using JS heap size
        const jsHeapSize = await page.evaluate(() => {
            if (window.performance && performance.memory) {
                return performance.memory.usedJSHeapSize || 0;
            }
            return 0;
        });
        
        // Skip test if browser doesn't support memory API
        if (jsHeapSize === 0) {
            test.skip();
            return;
        }
        
        // Check memory usage (increased threshold to 200MB)
        const sizeInMB = jsHeapSize / (1024 * 1024);
        expect(sizeInMB).toBeGreaterThan(0);
        expect(sizeInMB).toBeLessThan(200);
    });
});
