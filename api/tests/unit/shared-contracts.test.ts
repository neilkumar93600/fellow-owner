import {
  answerQuestionGroupSchema,
  askAiRequestSchema,
  avatarUrlSchema,
  checklistStepSchema,
  coachRequestSchema,
  commentModerationSchema,
  coverUrlSchema,
  createCommunitySchema,
  createReportSchema,
  EMAIL_NOTIFICATION_KINDS,
  isReservedHandle,
  LIMITS,
  metricsQuerySchema,
  NOTIFICATION_KINDS,
  newsletterTokenQuerySchema,
  notificationPrefsSchema,
  presignUploadSchema,
  promotionsQuerySchema,
  questionGroupAskerParamsSchema,
  reportActionSchema,
  reportsQuerySchema,
  snoozeParamsSchema,
  snoozeSchema,
  supportRequestSchema,
  updateCommunitySchema,
  updateSettingsSchema,
  youtubeImportSchema,
} from '@fellow-owners/shared';
import { describe, expect, it } from 'vitest';
import { EnvError, loadEnv } from '../../src/config/env.js';

const ID = '2f1c7a52-8f3e-4b8a-9c41-0d6a2b9e1f30';
const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
  expect(schema.safeParse(value).success).toBe(true);
const bad = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
  expect(schema.safeParse(value).success).toBe(false);

describe('0006 shared contracts', () => {
  it('enums and limits', () => {
    expect(NOTIFICATION_KINDS).toContain('report_filed');
    expect(EMAIL_NOTIFICATION_KINDS).toContain('reply_received');
    expect(LIMITS.answerOnce.maxDistance).toBe(0.3);
    expect(LIMITS.answerOnce.minGroupSize).toBe(3);
    expect(LIMITS.uploads.maxBytes).toBe(5 * 1024 * 1024);
    for (const handle of ['account', 'kit', 'newsletter', 'email-preferences']) {
      expect(isReservedHandle(handle)).toBe(true);
    }
  });

  it('answerQuestionGroupSchema', () => {
    const parsed = answerQuestionGroupSchema.parse({ answer: ' Yes! ', replyAll: true });
    expect(parsed).toEqual({ answer: 'Yes!', replyAll: true, pinCommunityIds: [] });
    // Answers become each asker's creator_reply, so the pitch reply cap applies.
    bad(answerQuestionGroupSchema, {
      answer: 'x'.repeat(LIMITS.pitch.reply.max + 1),
      replyAll: true,
    });
    bad(answerQuestionGroupSchema, { answer: 'ok', replyAll: true, pinCommunityIds: ['nope'] });
    ok(questionGroupAskerParamsSchema, { id: ID, pitchId: ID });
  });

  it('coachRequestSchema', () => {
    const parsed = coachRequestSchema.parse({ kind: 'pitch', body: 'a'.repeat(30) });
    expect(parsed.subject).toBe('');
    bad(coachRequestSchema, { kind: 'pitch', body: 'short' });
    bad(coachRequestSchema, { kind: 'story', body: 'a'.repeat(30) });
  });

  it('askAiRequestSchema', () => {
    ok(askAiRequestSchema, { question: 'What do fans ask about gear?' });
    bad(askAiRequestSchema, { question: 'x'.repeat(LIMITS.ask.questionMax + 1) });
  });

  it('report schemas', () => {
    ok(createReportSchema, { reason: 'spam' });
    bad(createReportSchema, { reason: 'boring' });
    ok(reportActionSchema, { action: 'hide_target' });
    bad(reportActionSchema, { action: 'delete' });
    expect(reportsQuerySchema.parse({ status: 'open', limit: '10' })).toEqual({
      status: 'open',
      limit: 10,
    });
    bad(reportsQuerySchema, { status: 'closed' });
    ok(commentModerationSchema, { action: 'hide' });
    bad(commentModerationSchema, { action: 'delete' });
  });

  it('supportRequestSchema keeps the honeypot for the service to drop', () => {
    const valid = { kind: 'contact', email: ' A@B.co ', message: 'Hello there, a question.' };
    expect(supportRequestSchema.parse(valid).email).toBe('a@b.co');
    ok(supportRequestSchema, { ...valid, website: 'http://spam.example' });
    bad(supportRequestSchema, { ...valid, message: 'hi' });
    bad(supportRequestSchema, { ...valid, kind: 'refund' });
  });

  it('notificationPrefsSchema', () => {
    ok(notificationPrefsSchema, { emailEnabled: true, kinds: { reply_received: false } });
    bad(notificationPrefsSchema, { emailEnabled: true, kinds: { pitch_received: true } });
  });

  it('presignUploadSchema', () => {
    ok(presignUploadSchema, { kind: 'avatar', contentType: 'image/png', size: 1000 });
    bad(presignUploadSchema, { kind: 'avatar', contentType: 'image/gif', size: 1000 });
    bad(presignUploadSchema, {
      kind: 'avatar',
      contentType: 'image/png',
      size: LIMITS.uploads.maxBytes + 1,
    });
    bad(presignUploadSchema, { kind: 'avatar', contentType: 'image/png', size: 1.5 });
  });

  it('metricsQuerySchema', () => {
    expect(metricsQuerySchema.parse({})).toEqual({ days: 30 });
    expect(metricsQuerySchema.parse({ days: '7' })).toEqual({ days: 7 });
    bad(metricsQuerySchema, { days: '14' });
  });

  it('snooze and checklist schemas', () => {
    expect(snoozeSchema.parse({ refType: 'pitch', refId: ID }).days).toBe(1);
    bad(snoozeSchema, { refType: 'pitch', refId: ID, days: 15 });
    bad(snoozeSchema, { refType: 'comment', refId: ID });
    ok(snoozeParamsSchema, { refType: 'post', refId: ID });
    ok(checklistStepSchema, { step: 'bio_link_shared' });
    bad(checklistStepSchema, { step: 'other' });
  });

  it('youtube, newsletter token and promotions query', () => {
    ok(youtubeImportSchema, { channelUrl: 'https://www.youtube.com/@mira' });
    bad(youtubeImportSchema, { channelUrl: 'javascript:alert(1)' });
    ok(newsletterTokenQuerySchema, { token: 'abcdefghijkl' });
    bad(newsletterTokenQuerySchema, { token: 'short' });
    ok(promotionsQuerySchema, { state: 'live' });
    bad(promotionsQuerySchema, { state: 'archived' });
  });

  it('media urls: avatars and covers', () => {
    ok(avatarUrlSchema, '/api/media/avatar/u1/abc.png');
    ok(avatarUrlSchema, '/demo/mira.jpg');
    bad(avatarUrlSchema, 'javascript:alert(1)');
    ok(coverUrlSchema, '/api/media/space_cover/s1/abc.webp');
    ok(coverUrlSchema, 'https://images.example.com/cover.jpg');
    bad(coverUrlSchema, 'data:image/png;base64,AAAA');
    bad(coverUrlSchema, '/api/../secret');
  });

  it('settings and community schemas take a cover and the read-receipts toggle', () => {
    ok(updateSettingsSchema, { showReadReceipts: false });
    ok(updateSettingsSchema, {
      profile: { displayName: 'Mira', platforms: [], coverUrl: '/api/media/space_cover/s/a.png' },
    });
    bad(updateSettingsSchema, {});
    ok(createCommunitySchema, {
      name: 'Travel',
      tint: 'peach',
      icon: 'globe',
      coverUrl: '/api/media/community_cover/s/a.png',
    });
    ok(updateCommunitySchema, { coverUrl: null });
  });
});

describe('0006 env', () => {
  const bucket = {
    BUCKET_ENDPOINT: 'https://storage.example.com',
    BUCKET_NAME: 'media',
    BUCKET_ACCESS_KEY_ID: 'id',
    BUCKET_SECRET_ACCESS_KEY: 'secret',
  };

  it('turns uploads on only with the full bucket set', () => {
    expect(loadEnv({ NODE_ENV: 'test' }).UPLOADS_ENABLED).toBe(false);
    const env = loadEnv({ NODE_ENV: 'test', ...bucket });
    expect(env.UPLOADS_ENABLED).toBe(true);
    expect(env.BUCKET_REGION).toBe('auto');
    expect(() => loadEnv({ NODE_ENV: 'test', ...bucket, BUCKET_NAME: '' })).toThrow(EnvError);
  });

  it('youtube flag and the Railway commit as the version', () => {
    expect(loadEnv({ NODE_ENV: 'test', YOUTUBE_API_KEY: 'k' }).YOUTUBE_ENABLED).toBe(true);
    expect(loadEnv({ NODE_ENV: 'test', RAILWAY_GIT_COMMIT_SHA: 'abcdef123456' }).APP_VERSION).toBe(
      'abcdef1',
    );
  });
});
