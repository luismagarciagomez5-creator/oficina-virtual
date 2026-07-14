import { describe, expect, it } from 'vitest';
import {
  CENTRAL_EVENT_FIXTURES,
  INVALID_CENTRAL_EVENT_FIXTURES,
  validateApprovalActivity,
  validateOfficeActivityEvent,
  validateVoiceActivity,
  validateWhatsAppActivity,
  validateWorkflowActivity,
} from '../src/central-events';

describe('central event validation boundary', () => {
  it('accepts representative payloads from every normalized source', () => {
    const results = [
      validateWhatsAppActivity(CENTRAL_EVENT_FIXTURES.whatsappReceived),
      validateVoiceActivity(CENTRAL_EVENT_FIXTURES.voiceEnded),
      validateWorkflowActivity(CENTRAL_EVENT_FIXTURES.workflowBlocked),
      validateApprovalActivity(CENTRAL_EVENT_FIXTURES.approvalRequested),
    ];

    expect(results.every((result) => result.success)).toBe(true);
  });

  it('rejects missing workspace identity without throwing', () => {
    const result = validateWhatsAppActivity(INVALID_CENTRAL_EVENT_FIXTURES.missingWorkspace);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('invalid_payload');
      expect(result.issues.some((issue) => issue.path === 'workspaceId')).toBe(true);
    }
  });

  it('rejects malformed timestamps and future phases explicitly', () => {
    const malformedDate = validateVoiceActivity(INVALID_CENTRAL_EVENT_FIXTURES.invalidTimestamp);
    const unknownPhase = validateVoiceActivity(INVALID_CENTRAL_EVENT_FIXTURES.unknownVoicePhase);

    expect(malformedDate.success).toBe(false);
    expect(unknownPhase.success).toBe(false);
  });

  it('rejects unknown top-level fields while allowing provider data inside payload', () => {
    const withUnknownField = {
      ...CENTRAL_EVENT_FIXTURES.whatsappReceived,
      unexpectedProviderField: true,
    };
    const strictResult = validateWhatsAppActivity(withUnknownField);
    const payloadResult = validateWhatsAppActivity({
      ...CENTRAL_EVENT_FIXTURES.whatsappReceived,
      payload: { anyFutureProviderField: { nested: true } },
    });

    expect(strictResult.success).toBe(false);
    expect(payloadResult.success).toBe(true);
  });

  it('validates already-normalized office events before state reduction', () => {
    const adapted = validateWorkflowActivity(CENTRAL_EVENT_FIXTURES.workflowBlocked);
    expect(adapted.success).toBe(true);
    if (!adapted.success) return;

    expect(validateOfficeActivityEvent(adapted.event)).toEqual(adapted);
    expect(
      validateOfficeActivityEvent({ ...adapted.event, agentId: 'unknown-agent' }),
    ).toMatchObject({ success: false, error: 'invalid_payload' });
  });
});

