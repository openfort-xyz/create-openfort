import fetch from 'node-fetch';
import { CLI_VERSION } from '../version';
import { prompts } from './prompts';
import { hostname, userInfo } from 'os';
import { createHash } from 'crypto';
import { isVerboseDebug } from './verboseLevel';

const getAnonymousId = () => {
  // Combines hostname + username, hashed = anonymous but consistent
  const identifier = `${hostname()}-${userInfo().username}`;
  return createHash('sha256').update(identifier).digest('hex').slice(0, 16);
};

class Telemetry {
  anonymousId: string;
  enabled: boolean = true;
  sessionId: string;

  projectId?: string;

  constructor() {
    this.anonymousId = getAnonymousId();
    this.sessionId = Math.random().toString(36).substring(2, 15);
  }

  send = async ({
    properties = {},
    status,
  }: {
    properties?: Record<string, any>,
    status: 'started' | 'completed' | 'error'
  }) => {
    if (!this.enabled) return;

    const key = process.env.POSTHOG_KEY;
    const host = process.env.POSTHOG_HOST;
    if (!key || !host) return;

    const fullProperties = {
      session_id: this.sessionId,
      cli_version: CLI_VERSION,
      node_version: process.version,
      platform: process.platform,
      projectId: this.projectId,
      cli_status: status,
      ...properties,
    };
    const response = await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: key,
        event: 'cli_tool_used',
        distinct_id: this.anonymousId,
        properties: fullProperties,
      }),
    }).catch((e) => {
      if (isVerboseDebug) {
        prompts.log.error('Failed to send telemetry' + JSON.stringify(e, null, 2));
      }
    });

    if (isVerboseDebug) {
      if (response?.ok) {
        console.log(`Telemetry sent: ${JSON.stringify(fullProperties, null, 2)}`);
      } else {
        console.error(`Failed to send telemetry: ${JSON.stringify(response, null, 2)}`);
      }
    }
  }
}


export const telemetry = new Telemetry();