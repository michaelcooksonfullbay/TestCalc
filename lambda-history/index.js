const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'testcalc-history';

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.rawPath || event.path || '';

  // CORS preflight
  if (method === 'OPTIONS') {
    return response(200, {});
  }

  try {
    // GET /api/history — list all non-deleted records
    if (method === 'GET' && path === '/api/history') {
      const params = event.queryStringParameters || {};
      const result = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'isDeleted = :zero',
        ExpressionAttributeValues: { ':zero': 0 },
      }));

      let items = result.Items || [];

      // Optional userId filter
      if (params.userId) {
        items = items.filter(item => item.userId === params.userId);
      }

      // Sort by createdAt descending
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return response(200, { items, total: items.length });
    }

    // POST /api/history — create a new record
    if (method === 'POST' && path === '/api/history') {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      const { userId, expression, result } = body || {};

      if (!userId || !expression || result === undefined) {
        return response(400, { error: 'userId, expression, and result are required' });
      }

      const now = new Date().toISOString();
      const item = {
        id: crypto.randomUUID(),
        userId,
        expression,
        result: String(result),
        createdAt: now,
        modifiedAt: now,
        isDeleted: 0,
      };

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      }));

      return response(201, item);
    }

    // DELETE /api/history/{id} — soft delete
    if (method === 'DELETE' && path.startsWith('/api/history/')) {
      const id = path.split('/api/history/')[1];
      if (!id) {
        return response(400, { error: 'id is required' });
      }

      const now = new Date().toISOString();
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: 'SET isDeleted = :one, modifiedAt = :now',
        ExpressionAttributeValues: { ':one': 1, ':now': now },
      }));

      return response(200, { message: 'Deleted', id });
    }

    return response(404, { error: 'Not found' });
  } catch (err) {
    console.error('Error:', err);
    return response(500, { error: 'Internal server error' });
  }
};
