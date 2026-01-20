/**
 * App Structure Tests
 *
 * Verifies app self-awareness context for the chat system.
 */

import { describe, it, expect } from 'vitest';
import {
  APP_STRUCTURE,
  buildAppContext,
  generateAppContextPrompt,
  getPageByPath,
  getNavigablePages,
} from '@/lib/chat/context/app-structure';

describe('App Structure', () => {
  describe('APP_STRUCTURE', () => {
    it('should have all main pages defined', () => {
      const requiredPages = [
        'dashboard',
        'clients',
        'clientDetail',
        'pipeline',
        'integrations',
        'settings',
        'knowledgeBase',
      ];

      for (const page of requiredPages) {
        expect(APP_STRUCTURE[page]).toBeDefined();
        expect(APP_STRUCTURE[page].name).toBeTruthy();
        expect(APP_STRUCTURE[page].path).toBeTruthy();
        expect(APP_STRUCTURE[page].description).toBeTruthy();
        expect(APP_STRUCTURE[page].availableActions.length).toBeGreaterThan(0);
      }
    });

    it('should have clientDetail with contextFields for clientId', () => {
      const clientDetail = APP_STRUCTURE.clientDetail;
      expect(clientDetail.contextFields).toContain('clientId');
      expect(clientDetail.contextFields).toContain('clientName');
    });
  });

  describe('buildAppContext', () => {
    it('should build context for dashboard', () => {
      const context = buildAppContext('dashboard');

      expect(context.currentPage).toBe('Dashboard');
      expect(context.pageDescription).toContain('dashboard');
      expect(context.availableActions.length).toBeGreaterThan(0);
      expect(context.userRole).toBe('member'); // default
    });

    it('should build context for client detail with client info', () => {
      const context = buildAppContext('clientDetail', {
        clientId: 'client-123',
        clientName: 'Acme Corp',
        userRole: 'admin',
      });

      expect(context.currentPage).toBe('Client Detail');
      expect(context.clientId).toBe('client-123');
      expect(context.clientName).toBe('Acme Corp');
      expect(context.userRole).toBe('admin');
    });

    it('should include recent alerts when provided', () => {
      const alerts = [
        { id: '1', message: 'Budget exceeded', severity: 'warning' },
        { id: '2', message: 'Campaign paused', severity: 'critical' },
      ];

      const context = buildAppContext('dashboard', {
        recentAlerts: alerts,
      });

      expect(context.recentAlerts).toHaveLength(2);
      expect(context.recentAlerts?.[0].message).toBe('Budget exceeded');
    });

    it('should default to dashboard for unknown pages', () => {
      const context = buildAppContext('nonexistent-page');
      expect(context.currentPage).toBe('Dashboard');
    });
  });

  describe('generateAppContextPrompt', () => {
    it('should generate prompt with page info', () => {
      const context = buildAppContext('dashboard');
      const prompt = generateAppContextPrompt(context);

      expect(prompt).toContain('Dashboard');
      expect(prompt).toContain('Available actions');
      expect(prompt).toContain('User role');
    });

    it('should include client info when on client detail', () => {
      const context = buildAppContext('clientDetail', {
        clientId: 'client-456',
        clientName: 'Test Client',
      });
      const prompt = generateAppContextPrompt(context);

      expect(prompt).toContain('Test Client');
      expect(prompt).toContain('client-456');
    });

    it('should include recent alerts when present', () => {
      const context = buildAppContext('dashboard', {
        recentAlerts: [
          { id: '1', message: 'High spend alert', severity: 'warning' },
        ],
      });
      const prompt = generateAppContextPrompt(context);

      expect(prompt).toContain('High spend alert');
      expect(prompt).toContain('WARNING');
    });
  });

  describe('getPageByPath', () => {
    it('should return page for exact path match', () => {
      const page = getPageByPath('/');
      expect(page?.id).toBe('dashboard');
    });

    it('should return clientDetail for dynamic client routes', () => {
      const page = getPageByPath('/client/abc123');
      expect(page?.id).toBe('clientDetail');
    });

    it('should return null for unknown paths', () => {
      const page = getPageByPath('/unknown/path/here');
      expect(page).toBeNull();
    });
  });

  describe('getNavigablePages', () => {
    it('should return all pages with name, path, description', () => {
      const pages = getNavigablePages();

      expect(pages.length).toBeGreaterThan(5);
      for (const page of pages) {
        expect(page.name).toBeTruthy();
        expect(page.path).toBeTruthy();
        expect(page.description).toBeTruthy();
      }
    });
  });
});
