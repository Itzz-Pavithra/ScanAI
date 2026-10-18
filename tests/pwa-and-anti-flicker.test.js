import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { THEMES } from '../src/lib/config/themes.js';

describe('PWA & Anti-Flicker Architecture Tests', () => {
	it('validates web app manifest adheres to PWA installability requirements', () => {
		const manifestPath = path.resolve('static/manifest.webmanifest');
		assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist in static folder');

		const raw = fs.readFileSync(manifestPath, 'utf8');
		const manifest = JSON.parse(raw);

		assert.equal(manifest.name, 'ScanAI — Multimodal AI Visual Scanner');
		assert.equal(manifest.short_name, 'ScanAI');
		assert.equal(manifest.display, 'standalone');
		assert.equal(manifest.start_url, '/');
		assert.ok(manifest.icons && manifest.icons.length >= 2, 'Must provide multiple icons');

		// Check icon sizes
		const has192 = manifest.icons.some((i) => i.sizes.includes('192x192'));
		const has512 = manifest.icons.some((i) => i.sizes.includes('512x512'));
		assert.ok(has192, 'Must include 192x192 icon');
		assert.ok(has512, 'Must include 512x512 icon');

		// Verify referenced files exist
		for (const icon of manifest.icons) {
			const iconPath = path.resolve('static', icon.src.replace(/^\//, ''));
			assert.ok(fs.existsSync(iconPath), `Icon file ${icon.src} must exist in static directory`);
		}
	});

	it('ensures service worker does not cache sensitive API routes or force disruptive auto-reloads', () => {
		const swPath = path.resolve('src/service-worker.js');
		const swContent = fs.readFileSync(swPath, 'utf8');

		// Must bypass all /api/ routes
		assert.ok(
			swContent.includes("url.pathname.startsWith('/api/')"),
			'Service worker must explicitly bypass /api/ routes'
		);

		// Must not have self.skipWaiting() inside the install listener
		const installBlockMatch = swContent.match(/addEventListener\('install'[\s\S]*?\}\);/);
		assert.ok(installBlockMatch, 'Install listener must exist');
		assert.equal(
			installBlockMatch[0].includes('self.skipWaiting()'),
			false,
			'Install listener must NOT call self.skipWaiting() automatically to avoid unexpected controllerchange reloads'
		);
	});

	it('verifies theme configurations contain all necessary theme color variables without missing fields', () => {
		const providers = ['chatgpt', 'claude', 'gemini'];
		for (const p of providers) {
			const theme = THEMES[p];
			assert.ok(theme, `Theme for ${p} must exist`);
			assert.ok(theme.bgApp, `Theme ${p} must define bgApp`);
			assert.ok(theme.textPrimary, `Theme ${p} must define textPrimary`);
			assert.ok(theme.accentPrimary, `Theme ${p} must define accentPrimary`);
			assert.ok(Array.isArray(theme.orbColors), `Theme ${p} must define orbColors array`);
		}
	});

	it('verifies app.html contains synchronous anti-flicker theme initialization script', () => {
		const appHtmlPath = path.resolve('src/app.html');
		const html = fs.readFileSync(appHtmlPath, 'utf8');

		assert.ok(html.includes('scanai_provider'), 'app.html must check localStorage scanai_provider before paint');
		assert.ok(html.includes('document.documentElement.dataset.theme'), 'app.html must set dataset.theme synchronously');
		assert.ok(html.includes('manifest.webmanifest'), 'app.html must link to manifest.webmanifest');
	});
});
