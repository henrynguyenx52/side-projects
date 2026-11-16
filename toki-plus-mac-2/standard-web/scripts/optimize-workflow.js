'use strict';

const fs = require('node:fs');
const path = require('node:path');

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error('Usage: node optimize-workflow.js <input.json> <output.json>');
  process.exit(1);
}

const workflow = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const previewOutput = workflow.nodes?.find((node) => Number(node.id) === 393);
const hdUpscale = workflow.nodes?.find((node) => Number(node.id) === 489);
const finalOutput = workflow.nodes?.find((node) => Number(node.id) === 490);

if (!previewOutput || previewOutput.type !== 'VHS_VideoCombine') {
  throw new Error('Không tìm thấy VHS_VideoCombine node 393.');
}
if (!hdUpscale || hdUpscale.type !== 'ImageResizeKJv2' || hdUpscale.mode !== 0) {
  throw new Error('Node upscale HD 489 không còn đúng cấu hình mong đợi.');
}
if (!finalOutput || finalOutput.type !== 'VHS_VideoCombine' || finalOutput.mode !== 0) {
  throw new Error('Node output HD 490 không còn đúng cấu hình mong đợi.');
}

previewOutput.mode = 4;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');

console.log(`Đã bypass node 393 và giữ nguyên node 489/490: ${outputPath}`);
