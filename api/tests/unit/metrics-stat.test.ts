import { describe, expect, it } from 'vitest';
import { MIN_CHANGE_BASE, stat } from '../../src/services/metrics.service.js';

describe('stat', () => {
  it('has no change note when the previous value is below the base', () => {
    expect(MIN_CHANGE_BASE).toBe(20);
    expect(stat(295, 10)).toEqual({ value: 295, previous: 10, changePct: null });
    expect(stat(0, 0).changePct).toBeNull();
    expect(stat(5, 19).changePct).toBeNull();
  });

  it('rounds the change once the base is big enough', () => {
    expect(stat(120, 100).changePct).toBe(20);
    expect(stat(80, 100).changePct).toBe(-20);
    expect(stat(30, 20).changePct).toBe(50);
  });
});
