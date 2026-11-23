import path from 'node:path';

export function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\"'\"'`)}'`;
}

export function safeName(filename) {
  const normalized = path.basename(filename).normalize('NFKC');
  const cleaned = normalized.replace(/[^\p{L}\p{N}._-]+/gu, '_');
  return cleaned.slice(0, 140) || 'file';
}

export function expandCommand(template, context) {
  const replacements = {
    input_dir: shellQuote(context.inputDir),
    output_dir: shellQuote(context.outputDir),
    images: context.images.map(shellQuote).join(' '),
    videos: context.videos.map(shellQuote).join(' '),
    prompt: shellQuote(context.prompt || ''),
    runner: shellQuote(context.runner || ''),
  };

  return template.replace(/\{(input_dir|output_dir|images|videos|prompt|runner)\}/g, (_, key) => replacements[key]);
}

export function validateRemoteBase(remoteBase) {
  if (!remoteBase || !remoteBase.startsWith('/')) {
    throw new Error('Remote workspace phải là đường dẫn tuyệt đối, ví dụ /home/ubuntu/gpu-jobs');
  }
  if (!/^\/[A-Za-z0-9._/-]+$/.test(remoteBase)) {
    throw new Error('Remote workspace chỉ được chứa chữ, số, dấu chấm, gạch ngang, gạch dưới và /');
  }
  return remoteBase.replace(/\/+$/, '');
}

export function parsePort(value) {
  const port = Number(value || 22);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SSH port phải nằm trong khoảng 1–65535');
  }
  return port;
}

function tokenizeSshCommand(command) {
  const tokens = [];
  const pattern = /"((?:\\.|[^"\\])*)"|'([^']*)'|([^\s]+)/g;
  let match;
  while ((match = pattern.exec(command)) !== null) {
    tokens.push((match[1] ?? match[2] ?? match[3]).replace(/\\([\\"' ])/g, '$1'));
  }
  return tokens;
}

export function parseSshCommand(command) {
  const tokens = tokenizeSshCommand(String(command || '').trim());
  if (tokens[0] !== 'ssh') throw new Error('Lệnh phải bắt đầu bằng ssh');

  let port = 22;
  let username = '';
  let identityFile = '';
  let target = '';

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (['-p', '-i', '-l', '-L', '-R', '-D', '-J', '-o'].includes(token)) {
      const value = tokens[++index];
      if (!value) throw new Error(`Thiếu giá trị cho ${token}`);
      if (token === '-p') port = parsePort(value);
      if (token === '-i') identityFile = value;
      if (token === '-l') username = value;
      if (token === '-o') {
        const separator = value.indexOf('=');
        const key = (separator >= 0 ? value.slice(0, separator) : value).toLowerCase();
        const optionValue = separator >= 0 ? value.slice(separator + 1) : '';
        if (key === 'identityfile') identityFile = optionValue;
        if (key === 'port') port = parsePort(optionValue);
        if (key === 'user') username = optionValue;
      }
      continue;
    }
    if (/^-[46AaCfgKkMNnqsTtVvXxYy]$/.test(token)) continue;
    if (token.startsWith('-')) throw new Error(`SSH option chưa được hỗ trợ: ${token}`);
    if (target) throw new Error('Chỉ paste lệnh kết nối SSH, không thêm remote command phía sau');
    target = token;
  }

  if (!target) throw new Error('Không tìm thấy user@host trong lệnh SSH');
  const at = target.lastIndexOf('@');
  const host = (at >= 0 ? target.slice(at + 1) : target).replace(/^\[|\]$/g, '');
  username = username || (at >= 0 ? target.slice(0, at) : '');
  if (!host || !username) throw new Error('Lệnh SSH cần có dạng user@host');

  return { host, port, username, identityFile };
}
