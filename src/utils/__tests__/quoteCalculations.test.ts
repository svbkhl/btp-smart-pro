/**
 * Tests unitaires pour le moteur de calcul de devis
 */

import { describe, it, expect } from 'vitest';
import {
  computeLineTotals,
  computeQuoteTotals,
  roundTo2Decimals,
  validateQuoteLine,
  formatCurrency,
  formatTvaRate,
} from '../quoteCalculations';

describe('quoteCalculations', () => {
  describe('roundTo2Decimals', () => {
    it('should round to 2 decimals', () => {
      expect(roundTo2Decimals(10.123)).toBe(10.12);
      expect(roundTo2Decimals(10.125)).toBe(10.13);
      expect(roundTo2Decimals(10.126)).toBe(10.13);
      expect(roundTo2Decimals(10.1)).toBe(10.1);
    });
  });

  describe('computeLineTotals', () => {
    it('should calculate line totals correctly', () => {
      const line = {
        quantity: 10,
        unit_price_ht: 25.50,
        tva_rate: 0.20,
      };

      const totals = computeLineTotals(line);

      expect(totals.total_ht).toBe(255.0); // 10 * 25.50
      expect(totals.total_tva).toBe(51.0); // 255 * 0.20
      expect(totals.total_ttc).toBe(306.0); // 255 + 51
    });

    it('should handle null quantities and prices', () => {
      const line = {
        quantity: null,
        unit_price_ht: null,
        tva_rate: 0.20,
      };

      const totals = computeLineTotals(line);

      expect(totals.total_ht).toBe(0);
      expect(totals.total_tva).toBe(0);
      expect(totals.total_ttc).toBe(0);
    });

    it('should handle different TVA rates', () => {
      const line = {
        quantity: 100,
        unit_price_ht: 10,
        tva_rate: 0.055, // 5.5%
      };

      const totals = computeLineTotals(line);

      expect(totals.total_ht).toBe(1000.0);
      expect(totals.total_tva).toBe(55.0);
      expect(totals.total_ttc).toBe(1055.0);
    });

    it('should round correctly', () => {
      const line = {
        quantity: 3,
        unit_price_ht: 33.333,
        tva_rate: 0.20,
      };

      const totals = computeLineTotals(line);

      expect(totals.total_ht).toBe(99.99); // 3 * 33.333 = 99.999 -> 99.99
      expect(totals.total_tva).toBe(20.0); // 99.99 * 0.20 = 19.998 -> 20.00
      expect(totals.total_ttc).toBe(119.99); // 99.99 + 20.00
    });
  });

  describe('computeQuoteTotals', () => {
    it('should calculate quote totals from multiple lines', () => {
      const lines = [
        {
          quantity: 10,
          unit_price_ht: 25.50,
          tva_rate: 0.20,
        },
        {
          quantity: 5,
          unit_price_ht: 15.00,
          tva_rate: 0.20,
        },
      ];

      const totals = computeQuoteTotals(lines);

      expect(totals.subtotal_ht).toBe(330.0); // 255 + 75
      expect(totals.total_tva).toBe(66.0); // 51 + 15
      expect(totals.total_ttc).toBe(396.0); // 330 + 66
    });

    it('should use default TVA rate when line has no rate', () => {
      const lines = [
        {
          quantity: 10,
          unit_price_ht: 25.50,
          tva_rate: 0.20,
        },
        {
          quantity: 5,
          unit_price_ht: 15.00,
          // Pas de tva_rate
        },
      ];

      const totals = computeQuoteTotals(lines, 0.20);

      expect(totals.subtotal_ht).toBe(330.0);
      expect(totals.total_tva).toBe(66.0);
    });

    it('should handle empty lines array', () => {
      const totals = computeQuoteTotals([]);

      expect(totals.subtotal_ht).toBe(0);
      expect(totals.total_tva).toBe(0);
      expect(totals.total_ttc).toBe(0);
    });
  });

  describe('validateQuoteLine', () => {
    it('should validate a correct line', () => {
      const line = {
        label: 'Test line',
        quantity: 10,
        unit_price_ht: 25.50,
        tva_rate: 0.20,
      };

      const result = validateQuoteLine(line);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing label', () => {
      const line = {
        quantity: 10,
        unit_price_ht: 25.50,
      };

      const result = validateQuoteLine(line);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Le libellé de la ligne est requis');
    });

    it('should detect negative quantity', () => {
      const line = {
        label: 'Test',
        quantity: -5,
        unit_price_ht: 25.50,
      };

      const result = validateQuoteLine(line);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La quantité ne peut pas être négative');
    });

    it('should detect invalid TVA rate', () => {
      const line = {
        label: 'Test',
        quantity: 10,
        unit_price_ht: 25.50,
        tva_rate: 1.5, // > 1
      };

      const result = validateQuoteLine(line);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Le taux TVA doit être entre 0 et 1 (0% à 100%)');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('1\u00a0234,56\u00a0€');
      expect(formatCurrency(0)).toBe('0,00\u00a0€');
      expect(formatCurrency(100.5)).toBe('100,50\u00a0€');
    });
  });

  describe('formatTvaRate', () => {
    it('should format TVA rate as percentage', () => {
      expect(formatTvaRate(0.20)).toBe('20.00%');
      expect(formatTvaRate(0.055)).toBe('5.50%');
      expect(formatTvaRate(0)).toBe('0.00%');
      expect(formatTvaRate(1)).toBe('100.00%');
    });
  });
});
