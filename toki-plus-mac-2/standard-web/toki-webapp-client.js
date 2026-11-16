'use strict';

const defaultWebApi = require('../src/runninghub/web-api');
const defaultCipher = require('../src/accounts/account-cipher');
const {
  DEFAULT_MODEL_ID,
  DEFAULT_NEGATIVE_PROMPT,
  DEFAULT_PROMPT,
  getModelPreset,
} = require('./config');

function buildExtraInputs(model, backImage) {
  const inputs = [];
  if (model.workflowId) {
    inputs.push({
      nodeId: model.workflowId === '2112427207607308290' ? '492' : '3',
      fieldName: 'text',
      fieldValue: DEFAULT_PROMPT,
    });
    inputs.push({ nodeId: '4', fieldName: 'text', fieldValue: DEFAULT_NEGATIVE_PROMPT });
  }
  if (model.fps === 30) {
    inputs.push({ nodeId: '308', fieldName: 'upscale_method', fieldValue: 'bicubic' });
  }
  if (model.requiresBackImage) {
    if (!backImage) throw new Error(`${model.label} cần ảnh mặt sau.`);
    inputs.push({ nodeId: '426', fieldName: 'image', fieldValue: backImage });
    inputs.push({ nodeId: '454', fieldName: 'value', fieldValue: true });
  }
  return inputs;
}

async function createWebAppTaskStrict(webApi, model, image, backImage, video, accessToken) {
  const targetId = model.appId || model.workflowId;
  const extraInputs = buildExtraInputs(model, backImage);
  if (typeof webApi.createWebAppTaskStrict === 'function') {
    return webApi.createWebAppTaskStrict(
      targetId,
      image,
      video,
      accessToken,
      model.instanceType,
      extraInputs,
    );
  }
  const response = await fetch('https://www.runninghub.ai/task/webapp/create', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      webappId: targetId,
      inputs: [
        { nodeId: '30', fieldName: 'image', fieldValue: image },
        { nodeId: '33', fieldName: 'video', fieldValue: video },
        ...extraInputs,
      ],
      instanceType: model.instanceType,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.code !== 0 || !data?.data?.taskId) {
    throw new Error(data?.msg || data?.message || `Không thể chạy model ${model.label} (HTTP ${response.status}).`);
  }
  return String(data.data.taskId);
}

class TokiWebAppClient {
  constructor(auth, options = {}) {
    const directAccount = auth && typeof auth === 'object'
      ? { email: String(auth.email || '').trim(), password: String(auth.password || '') }
      : null;
    this.credential = directAccount ? '' : String(auth || '').trim();
    this.webApi = options.webApi || defaultWebApi;
    this.cipher = options.cipher || defaultCipher;
    this.account = options.account || directAccount;
    this.accessToken = null;
    this.balanceBefore = null;
    if (directAccount && (!directAccount.email.includes('@') || !directAccount.password)) {
      throw new Error('Email hoặc mật khẩu RunningHub đang trống.');
    }
    if (!directAccount && !this.credential.startsWith('TOKI-ACC-')) {
      throw new Error('Thông tin đăng nhập RunningHub không hợp lệ.');
    }
  }

  async decodeAccount() {
    if (this.account) return this.account;
    let account = this.cipher.decryptAccount(this.credential);
    if (!account && typeof this.cipher.decryptAccountAsync === 'function') {
      account = await this.cipher.decryptAccountAsync(this.credential);
    }
    if (!account?.email || !account?.password) {
      throw new Error('Mã TOKI-ACC không hợp lệ hoặc không giải mã được trên máy này.');
    }
    this.account = account;
    return account;
  }

  async token(forceLogin = false) {
    const account = await this.decodeAccount();
    if (!forceLogin && this.accessToken) return this.accessToken;
    if (!forceLogin && account.accessToken) {
      try {
        await this.webApi.getRemainingCoins(account.accessToken);
        this.accessToken = account.accessToken;
        return this.accessToken;
      } catch {
        // Token hết hạn; đăng nhập lại bằng thông tin trong TOKI-ACC.
      }
    }
    const login = await this.webApi.loginRunningHub(account.email, account.password);
    this.accessToken = login.accessToken;
    return this.accessToken;
  }

  async withToken(action) {
    let token = await this.token(false);
    try {
      return await action(token);
    } catch (error) {
      if (!/TOKEN_INVALID|401|token.*expired|invalid.*token|not.*login|unauth/i.test(String(error?.message || error))) {
        throw error;
      }
      token = await this.token(true);
      return action(token);
    }
  }

  async getBalance() {
    return this.withToken((token) => this.webApi.getRemainingCoins(token));
  }

  async upload(filePath) {
    return this.withToken((token) => this.webApi.uploadToCos(filePath, token));
  }

  async run(image, video, modelId = DEFAULT_MODEL_ID, backImage = '') {
    const legacyModelId = modelId === 'plus'
      ? 'runninghub-wan21-60fps-pro'
      : modelId === 'default' ? DEFAULT_MODEL_ID : modelId;
    const model = getModelPreset(legacyModelId);
    if (!model) throw new Error('Model Motion Toki không hợp lệ.');
    this.balanceBefore = await this.getBalance();
    return this.withToken((token) => createWebAppTaskStrict(
      this.webApi,
      model,
      image,
      backImage,
      video,
      token,
    ));
  }

  async query(taskId) {
    const status = await this.withToken((token) => this.webApi.queryWebAppTask(taskId, token));
    if (!status.done) return { done: false, status: status.status || 'RUNNING' };
    if (status.status === 'FAILED') throw new Error(status.error || 'RunningHub WebApp task thất bại.');
    const url = await this.withToken((token) => this.webApi.getWebAppOutputUrl(taskId, token));
    const balanceAfter = await this.getBalance().catch(() => null);
    const spent = Number.isFinite(this.balanceBefore) && Number.isFinite(balanceAfter)
      ? Math.max(0, this.balanceBefore - balanceAfter)
      : 0;
    return {
      done: true,
      status: 'SUCCESS',
      url,
      outputs: [url],
      consumeCoins: spent,
      balanceBefore: this.balanceBefore,
      balanceAfter,
    };
  }

  clearSecrets() {
    this.credential = '';
    this.accessToken = null;
    if (this.account) this.account.password = '';
    this.account = null;
  }
}

module.exports = { TokiWebAppClient, buildExtraInputs };
