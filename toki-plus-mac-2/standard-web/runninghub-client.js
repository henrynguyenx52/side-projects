'use strict';

const fs = require('node:fs');
const path = require('node:path');

const API_BASE = 'https://www.runninghub.ai';
const REQUEST_TIMEOUT_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 10 * 60_000;

function timeoutSignal(ms) {
  return AbortSignal.timeout(ms);
}

function unwrap(payload) {
  return payload && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload;
}

function messageFrom(payload, fallback) {
  return String(
    payload?.message || payload?.msg || payload?.errorMessage || payload?.error || fallback,
  );
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

class RunningHubClient {
  constructor(apiKey, options = {}) {
    this.apiKey = String(apiKey || '').trim();
    this.baseUrl = options.baseUrl || API_BASE;
    this.fetch = options.fetch || fetch;
    if (!this.apiKey) throw new Error('API key đang trống.');
  }

  async post(endpoint, body, timeoutMs = REQUEST_TIMEOUT_MS) {
    const response = await this.fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: timeoutSignal(timeoutMs),
    });
    const payload = await readJson(response);
    if (!response.ok || (typeof payload?.code === 'number' && payload.code !== 0)) {
      throw new Error(messageFrom(payload, `RunningHub HTTP ${response.status}`));
    }
    return unwrap(payload);
  }

  async getBalance() {
    const data = await this.post('/uc/openapi/accountStatus', { apikey: this.apiKey });
    const balance = Number(data?.remainCoins);
    if (!Number.isFinite(balance)) {
      throw new Error('RunningHub không trả về số dư OpenAPI hợp lệ.');
    }
    return balance;
  }

  async upload(filePath) {
    const form = new FormData();
    const blob = await fs.openAsBlob(filePath);
    form.append('file', blob, path.basename(filePath));

    const response = await this.fetch(`${this.baseUrl}/openapi/v2/media/upload/binary`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: form,
      signal: timeoutSignal(UPLOAD_TIMEOUT_MS),
    });
    const payload = await readJson(response);
    if (!response.ok || (typeof payload?.code === 'number' && payload.code !== 0)) {
      throw new Error(messageFrom(payload, `Upload thất bại (HTTP ${response.status})`));
    }
    const data = unwrap(payload);
    const resource = data?.fileName || data?.filePath || data?.path || data?.name || data?.url;
    if (!resource) throw new Error('RunningHub upload xong nhưng không trả về tên file.');
    return resource;
  }

  async runStandard({ workflowId, image, video, prompt, negativePrompt }) {
    const nodeInfoList = [
      { nodeId: '30', fieldName: 'image', fieldValue: image },
      { nodeId: '33', fieldName: 'video', fieldValue: video },
      { nodeId: '3', fieldName: 'text', fieldValue: prompt },
      { nodeId: '4', fieldName: 'text', fieldValue: negativePrompt },
    ];
    const data = await this.post(`/openapi/v2/run/workflow/${encodeURIComponent(workflowId)}`, {
      addMetadata: true,
      nodeInfoList,
      instanceType: 'default',
      usePersonalQueue: false,
    });
    const taskId = data?.taskId || data?.id;
    if (!taskId) throw new Error(messageFrom(data, 'RunningHub không trả về taskId.'));
    return String(taskId);
  }

  async query(taskId) {
    const data = await this.post('/openapi/v2/query', { taskId });
    const status = String(data?.status || data?.taskStatus || '').toUpperCase();
    const rawOutputs = Array.isArray(data)
      ? data
      : data?.results || data?.outputs || data?.data || [];
    const outputs = (Array.isArray(rawOutputs) ? rawOutputs : [])
      .map((item) => item?.fileUrl || item?.url)
      .filter(Boolean);

    if (outputs.length) {
      const video = outputs.find((url) => /\.(mp4|mov|webm)(?:\?|$)/i.test(url)) || outputs[0];
      return {
        done: true,
        status: status || 'SUCCESS',
        url: video,
        outputs,
        consumeCoins: Number(data?.usage?.consumeCoins || 0),
      };
    }
    if (['FAILED', 'ERROR', 'CANCELED', 'CANCELLED'].includes(status) || data?.failed) {
      throw new Error(messageFrom(data, `Task ${taskId} thất bại.`));
    }
    if (['SUCCESS', 'COMPLETED'].includes(status)) {
      throw new Error('Task hoàn tất nhưng không có link video đầu ra.');
    }
    return { done: false, status: status || 'QUEUED' };
  }
}

module.exports = { RunningHubClient };
