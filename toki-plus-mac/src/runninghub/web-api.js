'use strict';

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const API_BASE_HOST = 'www.runninghub.ai';
const API_BASE = 'https://' + API_BASE_HOST;

const _DEBUG_LOG = path.join(__dirname, '..', '..', 'data', 'job_debug.log');
function logDebug(msg, data = null) {
  try {
    const line = `[${new Date().toISOString()}] ${msg}${data !== null ? ' ' + JSON.stringify(data) : ''}\n`;
    fs.appendFileSync(_DEBUG_LOG, line);
  } catch(e) {}
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Standard HTTPS POST JSON request
 */
function httpsPostJson(urlStr, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const bodyStr = JSON.stringify(bodyObj || {});
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', (err) => {
      logDebug('[HTTPS POST ERROR] ' + urlStr, { error: err.message, stack: err.stack });
      reject(err);
    });
    req.write(bodyStr);
    req.end();
  });
}

/**
 * Standard HTTPS GET JSON request
 */
function httpsGetJson(urlStr, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', (err) => {
      logDebug('[HTTPS GET ERROR] ' + urlStr, { error: err.message, stack: err.stack });
      reject(err);
    });
    req.end();
  });
}

/**
 * Standard HTTPS PUT Buffer (for Tencent COS binary upload)
 */
function httpsPutBuffer(urlStr, headers, buffer) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        'Content-Length': buffer.length,
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, status: res.statusCode });
        } else {
          const err = new Error(`COS PUT failed HTTP ${res.statusCode}: ${data}`);
          logDebug('[COS PUT HTTP ERROR]', { status: res.statusCode, data });
          reject(err);
        }
      });
    });
    req.on('error', (err) => {
      logDebug('[COS PUT ERROR] ' + urlStr, { error: err.message, stack: err.stack });
      reject(err);
    });
    req.write(buffer);
    req.end();
  });
}

/**
 * Log in using abroad pwdLogin
 */
async function loginRunningHub(email, password) {
  logDebug('loginRunningHub starting for', { email });
  const pwdHash = md5(password);
  const resp = await httpsPostJson(`${API_BASE}/uc/abroad/pwdLogin`, {}, {
    email: email.trim(),
    password: pwdHash
  });

  const data = resp.data;
  if (!data || data.code !== 0) {
    const msg = data?.msg || `Login failed with code ${resp.status}`;
    logDebug('loginRunningHub failed:', msg);
    throw new Error(msg);
  }

  logDebug('loginRunningHub success:', { identify: data.data.identify });
  return {
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token,
    identify: data.data.identify,
    userId: data.data.user_id,
    expireIn: data.data.expire_in
  };
}

/**
 * Query remaining RH Coins
 */
async function getRemainingCoins(accessToken) {
  logDebug('getRemainingCoins starting');
  const resp = await httpsPostJson(`${API_BASE}/uc/point/summary`, {
    'Authorization': `Bearer ${accessToken}`
  }, {});

  const data = resp.data;
  if (!data || data.code !== 0) {
    const msg = data?.msg || `Failed to get points summary with code ${resp.status}`;
    logDebug('getRemainingCoins failed:', msg);
    throw new Error(msg);
  }

  const coins = Number(data.data?.transitionCoinRemained ?? data.data?.pointsRemain ?? data.data?.balancePoint ?? 0);
  logDebug('getRemainingCoins success:', { coins });
  return coins;
}

/**
 * Upload local file directly to Tencent Cloud COS
 */
async function uploadToCos(filePath, accessToken) {
  logDebug('uploadToCos starting for:', filePath);

  // 1. Get credentials
  const credResp = await httpsPostJson(`${API_BASE}/api/storage/getCredentials`, {
    'Authorization': `Bearer ${accessToken}`
  }, { scene: 'images' });

  const credData = credResp.data;
  if (!credData || credData.code !== 0 || !credData.data) {
    const msg = credData?.msg || 'Failed to get upload credentials';
    logDebug('getCredentials failed:', msg);
    throw new Error(msg);
  }

  const {
    accessKey: secretId,
    secretKey,
    sessionToken,
    bucket,
    region,
    identify,
    cdnDomain
  } = credData.data;

  // 2. Read file data
  const fileBuf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);
  const randomName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
  const key = `${identify}/${dateStr}/${randomName}`;

  // 3. COS Signature
  const now = Math.floor(Date.now() / 1000);
  const signTime = `${now - 60};${now + 3600}`;
  const signKey = crypto.createHmac('sha1', secretKey).update(signTime).digest('hex');

  const pathname = `/${key}`;
  const host = `${bucket}.cos.${region}.myqcloud.com`;
  const headerList = 'host';
  const headersStr = `host=${host.toLowerCase()}`;

  const formatStr = `put\n${pathname}\n\n${headersStr}\n`;
  const shaFormat = crypto.createHash('sha1').update(formatStr).digest('hex');
  const stringToSign = `sha1\n${signTime}\n${shaFormat}\n`;
  const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex');

  const authHeader = `q-sign-algorithm=sha1&q-ak=${secretId}&q-sign-time=${signTime}&q-key-time=${signTime}&q-header-list=${headerList}&q-url-param-list=&q-signature=${signature}`;

  // 4. PUT file to COS
  const uploadUrl = `https://${host}${pathname}`;
  const contentType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.mp4' ? 'video/mp4' : 'application/octet-stream';

  await httpsPutBuffer(uploadUrl, {
    'Host': host,
    'Authorization': authHeader,
    'x-cos-security-token': sessionToken,
    'Content-Type': contentType
  }, fileBuf);

  const cdnUrl = `https://${cdnDomain}/${key}`;
  logDebug('uploadToCos success! CDN URL:', cdnUrl);
  return cdnUrl;
}

/**
 * Create WebApp task using free RH Coins
 */
async function createWebAppTask(webappId, imageCdnUrl, videoCdnUrl, accessToken, instanceType = 'default', extraInputs = []) {
  logDebug('createWebAppTask starting', { webappId, imageCdnUrl, videoCdnUrl, instanceType });
  const buildPayload = (instType, wId = webappId) => ({
    webappId: String(wId),
    inputs: [
      { nodeId: '30', fieldName: 'image', fieldValue: imageCdnUrl },
      { nodeId: '33', fieldName: 'video', fieldValue: videoCdnUrl },
      ...(Array.isArray(extraInputs) ? extraInputs : [])
    ],
    instanceType: instType || 'default'
  });

  let resp = await httpsPostJson(API_BASE + '/task/webapp/create', {
    'Authorization': 'Bearer ' + accessToken
  }, buildPayload(instanceType));

  let data = resp.data;
  if ((!data || data.code !== 0 || !data.data?.taskId) && instanceType && instanceType !== 'default') {
    logDebug('createWebAppTask retrying with default instanceType after failure:', data?.msg);
    resp = await httpsPostJson(API_BASE + '/task/webapp/create', {
      'Authorization': 'Bearer ' + accessToken
    }, buildPayload('default'));
    data = resp.data;
  }

  if ((!data || data.code !== 0 || !data.data?.taskId) && String(webappId) !== '2113512034955812865') {
    logDebug('createWebAppTask fallback to 2113512034955812865 after failure:', data?.msg);
    resp = await httpsPostJson(API_BASE + '/task/webapp/create', {
      'Authorization': 'Bearer ' + accessToken
    }, {
      webappId: '2113512034955812865',
      inputs: [
        { nodeId: '30', fieldName: 'image', fieldValue: imageCdnUrl },
        { nodeId: '33', fieldName: 'video', fieldValue: videoCdnUrl }
      ],
      instanceType: instanceType || 'default'
    });
    data = resp.data;
  }

  if (!data || data.code !== 0 || !data.data?.taskId) {
    const msg = data?.msg || ('Failed to create task with code ' + resp.status);
    logDebug('createWebAppTask failed:', msg);
    throw new Error(msg);
  }

  logDebug('createWebAppTask success! TaskId:', data.data.taskId);
  return String(data.data.taskId);
}

/**
 * Query WebApp task status
 */
async function queryWebAppTask(taskId, accessToken) {
  const resp = await httpsPostJson(`${API_BASE}/task/list`, {
    'Authorization': `Bearer ${accessToken}`
  }, {});

  if (resp.status === 401 || (resp.data && resp.data.code !== 0 && /TOKEN_INVALID|401|token.*expired|invalid.*token|not.*login|unauth/i.test(String(resp.data.msg || '')))) {
    throw new Error(resp.data?.msg || 'TOKEN_INVALID');
  }

  try {
    const records = resp.data?.data?.records || [];
    const rec = records.find(r => String(r.taskId) === String(taskId));
    if (!rec) {
      logDebug('queryWebAppTask: task not found in list yet', { taskId });
      return { done: false, status: 'RUNNING' };
    }

    const taskStatus = String(rec.taskStatus || '').toUpperCase();
    logDebug('queryWebAppTask status:', { taskId, taskStatus });

    if (taskStatus === 'SUCCESS') {
      return { done: true, status: 'SUCCESS', data: rec };
    }

    if (taskStatus === 'FAILED' || taskStatus === 'ERROR') {
      return { done: true, status: 'FAILED', error: rec.taskResultDesc || 'Task failed on RunningHub' };
    }

    return { done: false, status: taskStatus || 'RUNNING', data: rec };
  } catch (err) {
    logDebug('queryWebAppTask error:', err.message);
    return { done: false, status: 'RUNNING' };
  }
}

/**
 * Extract public output video URL from task outputs
 */
async function getWebAppOutputUrl(taskId, accessToken) {
  logDebug('getWebAppOutputUrl starting for taskId:', taskId);
  const resp = await httpsPostJson(`${API_BASE}/api/output/v2/history`, {
    'Authorization': `Bearer ${accessToken}`
  }, { page: 1, pageSize: 20 });

  if (resp.status === 401 || (resp.data && resp.data.code !== 0 && /TOKEN_INVALID|401|token.*expired|invalid.*token|not.*login|unauth/i.test(String(resp.data.msg || '')))) {
    throw new Error(resp.data?.msg || 'TOKEN_INVALID');
  }

  const items = resp.data?.data || [];
  const item = items.find(it => String(it.taskId) === String(taskId) || (it.promptResponse && it.promptResponse.includes(String(taskId))));

  if (item && item.fileUrl) {
    logDebug('getWebAppOutputUrl found fileUrl:', item.fileUrl);
    return item.fileUrl;
  }

  if (item && item.filePreviewUrl) {
    logDebug('getWebAppOutputUrl found filePreviewUrl:', item.filePreviewUrl);
    return item.filePreviewUrl;
  }

  if (items[0]?.fileUrl) {
    logDebug('getWebAppOutputUrl fallback to most recent fileUrl:', items[0].fileUrl);
    return items[0].fileUrl;
  }

  throw new Error('Could not find video URL in task output history for taskId ' + taskId);
}

module.exports = {
  md5,
  loginRunningHub,
  getRemainingCoins,
  uploadToCos,
  createWebAppTask,
  queryWebAppTask,
  getWebAppOutputUrl
};
