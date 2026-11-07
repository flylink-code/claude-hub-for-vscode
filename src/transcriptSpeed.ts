import type { OutputSpeedSample, OutputSpeedState } from './types.js';

type Row = Record<string, any>;
interface ResponsePart {
  time: number;
  tokens: number;
  model: string;
  stop: string;
}
interface RequestReading {
  start?: number;
  invalid: boolean;
  messages: Map<string, ResponsePart[]>;
  tools: Map<string, number>;
  uuids: Map<string, number>;
  lastIndex: number;
}

function timestamp(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) && time > 0 && time <= Date.now() + 5000 ? time : undefined;
}
function identity(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 4096;
}

/** Reads counters and identities only; never retains response text or request bodies. */
export class TranscriptSpeedCollector {
  private requests = new Map<string, RequestReading>();
  private results = new Map<string, number>();
  private finalLeaves = new Set<string>();
  private costBoundaries: number[] = [];
  private index = 0;
  private sessionId?: string;
  private sawAssistant = false;
  private sawRequest = false;
  private resetAt = 0;
  private latestTime = 0;

  consume(entry: Row): void {
    this.index++;
    if (!entry || typeof entry !== 'object' || entry.isSidechain === true) return;
    if (identity(entry.sessionId)) {
      if (this.sessionId && this.sessionId !== entry.sessionId) return;
      this.sessionId = entry.sessionId;
    }
    const time = timestamp(entry.timestamp);
    if (time) this.latestTime = Math.max(this.latestTime, time);
    if (entry.attachment?.type === 'model') {
      this.reset();
      return;
    }
    if (entry.type === 'api-request' && identity(entry.id)) {
      this.sawRequest = true;
      const req = this.request(entry.id);
      if (!time || (req.start !== undefined && req.start !== time)) req.invalid = true;
      else req.start = time;
    }
    if (entry.type === 'assistant') {
      this.sawAssistant = true;
      if (!identity(entry.requestRef)) return;
      const req = this.request(entry.requestRef);
      req.lastIndex = this.index;
      const msg = entry.message;
      const tokens = msg?.usage?.output_tokens;
      if (!time || !identity(msg?.id) || !identity(msg?.model) ||
          typeof tokens !== 'number' || !Number.isSafeInteger(tokens) || tokens < 0) {
        req.invalid = true;
        return;
      }
      const parts = req.messages.get(msg.id) || [];
      parts.push({ time, tokens, model: msg.model, stop: msg.stop_reason });
      req.messages.set(msg.id, parts);
      if (identity(entry.uuid)) req.uuids.set(entry.uuid, time);
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block?.type === 'tool_use' && identity(block.id)) {
            req.tools.set(block.id, Math.max(req.tools.get(block.id) || 0, time));
          }
        }
      }
    }
    if (entry.type === 'user') {
      if (Array.isArray(entry.message?.content) && time) {
        for (const block of entry.message.content) {
          if (block?.type === 'tool_result' && identity(block.tool_use_id)) {
            this.results.set(block.tool_use_id, time);
          }
        }
      }
      // A subsequent user prompt explicitly attached to the final response proves
      // that response is complete. A generic new request does not prove this.
      const content = entry.message?.content;
      const textPrompt = typeof content === 'string' ? content.trim().length > 0 :
        Array.isArray(content) && content.some((b: any) => b?.type === 'text' && typeof b.text === 'string' && b.text.trim());
      if (textPrompt && identity(entry.parentUuid)) this.finalLeaves.add(entry.parentUuid);
    }
    if (entry.type === 'cost-state') this.costBoundaries.push(this.index);
    // last-prompt is also emitted at request START in current IDE transcripts.
    // It must not be interpreted as a completion event.
  }

  reset(): void {
    this.requests.clear();
    this.results.clear();
    this.finalLeaves.clear();
    this.costBoundaries = [];
    this.sawRequest = false;
    this.sawAssistant = false;
    this.resetAt = this.latestTime;
  }

  private request(id: string): RequestReading {
    let req = this.requests.get(id);
    if (!req) {
      req = { invalid: false, messages: new Map(), tools: new Map(), uuids: new Map(), lastIndex: 0 };
      this.requests.set(id, req);
    }
    return req;
  }

  finish(): { sample?: OutputSpeedSample; state: OutputSpeedState; resetAt: number } {
    let sample: OutputSpeedSample | undefined;
    let pendingTime = 0;
    const boundaryOwners = new Map<number, RequestReading>();
    const ordered = [...this.requests.values()].sort((a, b) => a.lastIndex - b.lastIndex);
    let position = 0;
    let owner: RequestReading | undefined;
    for (const boundary of this.costBoundaries) {
      while (position < ordered.length && ordered[position].lastIndex < boundary) {
        const candidate = ordered[position++];
        if (candidate.lastIndex > 0) owner = candidate;
      }
      if (owner) boundaryOwners.set(boundary, owner);
    }
    const completedByCost = new Set(boundaryOwners.values());
    for (const req of this.requests.values()) {
      const parts = [...req.messages.values()].flat();
      const end = Math.max(0, ...parts.map(p => p.time));
      const modelSet = new Set(parts.map(p => p.model));
      let invalid = req.invalid || modelSet.size !== 1;
      let tokens = 0;
      for (const message of req.messages.values()) {
        const sorted = [...message].sort((a, b) => a.time - b.time);
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].tokens < sorted[i - 1].tokens ||
              (sorted[i].time === sorted[i - 1].time && sorted[i].tokens !== sorted[i - 1].tokens)) invalid = true;
        }
        tokens += sorted[sorted.length - 1].tokens;
      }
      const stops = parts.map(p => p.stop).filter(stop => stop != null);
      const terminal = stops.length > 0 && stops.every(stop => stop === 'end_turn' || stop === 'stop_sequence');
      const toolTimes = [...req.tools].map(([id, start]) => {
        const resultTime = this.results.get(id) || 0;
        return resultTime >= start ? resultTime : 0;
      });
      const toolsComplete = req.tools.size > 0 && stops.length > 0 && stops.every(stop => stop === 'tool_use') &&
        toolTimes.every(time => time > 0) && Math.max(...toolTimes) >= end;
      // Cost-state has no timestamp. Only accept it for a single final request
      // at that file-order boundary, never as a blanket concurrent completion.
      const costComplete = terminal && completedByCost.has(req) &&
        ![...this.requests.values()].some(other => other !== req && other.start !== undefined &&
          other.start >= (req.start || Infinity) && other.start <= end && other.lastIndex === 0);
      const complete = toolsComplete || (terminal && (costComplete || [...req.uuids].some(([id, time]) => time === end && this.finalLeaves.has(id))));
      const duration = req.start === undefined ? 0 : end - req.start;
      if (!complete) pendingTime = Math.max(pendingTime, req.start || end);
      if (invalid || !complete || duration < 500 || tokens <= 0 ||
          !Number.isSafeInteger(tokens) || parts.some(p => p.time < (req.start || Infinity))) continue;
      const rate = tokens * 1000 / duration;
      if (!Number.isFinite(rate) || rate <= 0 || (sample && sample.measuredAt >= end)) continue;
      sample = { tokensPerSecond: rate, outputTokens: tokens, durationMs: duration,
        model: parts[0].model, measuredAt: end, source: 'transcript' };
    }
    const state: OutputSpeedState = pendingTime > (sample?.measuredAt || 0) ? 'sampling' :
      sample ? 'available' : this.sawAssistant && !this.sawRequest ? 'unsupported' : 'waiting';
    return { sample, state, resetAt: this.resetAt };
  }
}

/** One selector for both full scans and lightweight terminal-sample refreshes. */
export function selectOutputSpeed(
  transcript: OutputSpeedSample | undefined,
  terminal: OutputSpeedSample | undefined,
  responseModel: string,
  resetAt = 0,
): OutputSpeedSample | undefined {
  const candidates = [transcript, terminal && { ...terminal, source: 'statusLine' as const }]
    .filter((s): s is OutputSpeedSample => !!s && s.model === responseModel && s.measuredAt > resetAt);
  return candidates.sort((a, b) => b.measuredAt - a.measuredAt)[0];
}
