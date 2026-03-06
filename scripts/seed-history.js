#!/usr/bin/env node
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const REGION = process.env.AWS_REGION || 'us-west-2';
const TABLE_NAME = process.env.TABLE_NAME || 'testcalc-history';
const PROFILE = process.env.AWS_PROFILE || 'fb-sandbox-non-prod/Admin';

// Configure client with profile
const client = new DynamoDBClient({
  region: REGION,
  credentials: undefined, // use default credential chain (profile set via env)
});
const docClient = DynamoDBDocumentClient.from(client);

// Charlie's 5 records — simple expressions
const charlieRecords = [
  { expression: '2 + 3', result: '5' },
  { expression: '10 - 4', result: '6' },
  { expression: '7 × 8', result: '56' },
  { expression: '100 ÷ 5', result: '20' },
  { expression: '15 + 25', result: '40' },
];

// Bob's 210 records — varied expressions spread over 30 days
function generateBobRecords() {
  const ops = [
    { expr: (a, b) => `${a} + ${b}`, calc: (a, b) => a + b },
    { expr: (a, b) => `${a} - ${b}`, calc: (a, b) => a - b },
    { expr: (a, b) => `${a} × ${b}`, calc: (a, b) => a * b },
    { expr: (a, b) => `${a} ÷ ${b}`, calc: (a, b) => a / b },
  ];
  const records = [];
  for (let i = 0; i < 210; i++) {
    const op = ops[i % 4];
    const a = Math.floor(Math.random() * 100) + 1;
    const b = op === ops[3] ? Math.floor(Math.random() * 20) + 1 : Math.floor(Math.random() * 100) + 1;
    const result = op.calc(a, b);
    const dayOffset = Math.floor(i / 7); // spread over ~30 days
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    date.setHours(Math.floor(Math.random() * 14) + 8); // 8am-10pm
    date.setMinutes(Math.floor(Math.random() * 60));
    date.setSeconds(Math.floor(Math.random() * 60));
    records.push({
      expression: op.expr(a, b),
      result: String(parseFloat(result.toFixed(6))),
      createdAt: date.toISOString(),
    });
  }
  return records;
}

function buildItems(userId, records) {
  return records.map((r) => {
    const now = r.createdAt || new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      userId,
      expression: r.expression,
      result: r.result,
      createdAt: now,
      modifiedAt: now,
      isDeleted: 0,
    };
  });
}

async function checkExistingData() {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    Limit: 1,
  }));
  return (result.Items || []).length > 0;
}

async function batchWrite(items) {
  // DynamoDB BatchWrite supports max 25 items per call
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    await docClient.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: batch.map(item => ({
          PutRequest: { Item: item },
        })),
      },
    }));
    process.stdout.write(`  Written ${Math.min(i + 25, items.length)}/${items.length}\r`);
  }
  console.log();
}

async function main() {
  console.log(`Seeding ${TABLE_NAME} in ${REGION}...`);

  const exists = await checkExistingData();
  if (exists) {
    console.log('Data already exists — skipping seed.');
    return;
  }

  // Charlie: 5 records
  const charlieItems = buildItems('charlie', charlieRecords);
  console.log(`Writing ${charlieItems.length} records for charlie...`);
  await batchWrite(charlieItems);

  // Bob: 210 records
  const bobRecords = generateBobRecords();
  const bobItems = buildItems('bob', bobRecords);
  console.log(`Writing ${bobItems.length} records for bob...`);
  await batchWrite(bobItems);

  console.log('Seed complete!');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
