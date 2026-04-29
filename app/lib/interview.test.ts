import { describe, expect, it } from 'vitest';
import {
  hasRequiredInterviewFields,
  normalizeInterviewPayload,
} from './interview';

describe('interview helpers', () => {
  it('normalizes whitespace and missing values', () => {
    expect(
      normalizeInterviewPayload({
        jobTitle: '  Frontend Engineer  ',
        experienceLevel: '  Mid-Level  ',
      })
    ).toEqual({
      jobTitle: 'Frontend Engineer',
      experienceLevel: 'Mid-Level',
      jobDescription: '',
    });
  });

  it('validates required fields', () => {
    expect(
      hasRequiredInterviewFields({
        jobTitle: 'Software Engineer',
        experienceLevel: 'Senior',
      })
    ).toBe(true);

    expect(
      hasRequiredInterviewFields({
        jobTitle: '   ',
        experienceLevel: 'Senior',
      })
    ).toBe(false);

    expect(
      hasRequiredInterviewFields({
        jobTitle: 'Software Engineer',
        experienceLevel: '',
      })
    ).toBe(false);
  });
});
