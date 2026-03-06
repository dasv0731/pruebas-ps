import { APIGatewayProxyResult } from 'aws-lambda';
import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data';
import { v4 as uuidv4 } from 'uuid';

const client = new RDSDataClient({ region: process.env.AWS_REGION });

const DB_CONFIG = {
  resourceArn: process.env.DB_CLUSTER_ARN!,
  secretArn: process.env.DB_SECRET_ARN!,
  database: 'peritopsicologico',
};

const response = (statusCode: number, body: object): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(body),
});

const formatRows = (records: any[], columnMetadata: any[]): object[] => {
  const columns = columnMetadata.map(col => col.name);
  return records.map(row =>
    Object.fromEntries(
      row.map((field: any, i: number) => [
        columns[i],
        field.stringValue ?? field.longValue ?? field.doubleValue ?? field.booleanValue ?? null,
      ])
    )
  );
};

// GET /casos
const listarCasos = async () => {
  const result = await client.send(new ExecuteStatementCommand({
    ...DB_CONFIG,
    includeResultMetadata: true,
    sql: `SELECT id, numero_expediente, tipo, motivo_consulta, juzgado,
                 fecha_apertura, estado, created_at
          FROM caso
          ORDER BY created_at DESC`,
  }));

  const rows = formatRows(result.records ?? [], result.columnMetadata ?? []);
  return response(200, { data: rows });
};

// GET /casos/:id
const obtenerCaso = async (id: string) => {
  const result = await client.send(new ExecuteStatementCommand({
    ...DB_CONFIG,
    includeResultMetadata: true,
    sql: `SELECT * FROM caso WHERE id = :id::uuid`,
    parameters: [{ name: 'id', value: { stringValue: id } }],
  }));

  if (!result.records?.length) return response(404, { error: 'Caso no encontrado' });
  const rows = formatRows(result.records, result.columnMetadata ?? []);
  return response(200, { data: rows[0] });
};

// POST /casos
const crearCaso = async (body: any) => {
  const { numero_expediente, tipo, motivo_consulta, juzgado, fecha_apertura, notas } = body;
  if (!numero_expediente) return response(400, { error: 'numero_expediente es requerido' });

  const id = uuidv4();
  await client.send(new ExecuteStatementCommand({
    ...DB_CONFIG,
    sql: `INSERT INTO caso (id, numero_expediente, tipo, motivo_consulta, juzgado, fecha_apertura, notas)
          VALUES (:id::uuid, :numero_expediente, :tipo, :motivo_consulta, :juzgado, :fecha_apertura::date, :notas)`,
    parameters: [
      { name: 'id', value: { stringValue: id } },
      { name: 'numero_expediente', value: { stringValue: numero_expediente } },
      { name: 'tipo', value: { stringValue: tipo ?? 'familiar' } },
      { name: 'motivo_consulta', value: motivo_consulta ? { stringValue: motivo_consulta } : { isNull: true } },
      { name: 'juzgado', value: juzgado ? { stringValue: juzgado } : { isNull: true } },
      { name: 'fecha_apertura', value: fecha_apertura ? { stringValue: fecha_apertura } : { stringValue: new Date().toISOString().split('T')[0] } },
      { name: 'notas', value: notas ? { stringValue: notas } : { isNull: true } },
    ],
  }));
  return response(201, { data: { id, numero_expediente } });
};

// PUT /casos/:id
const actualizarCaso = async (id: string, body: any) => {
  const { tipo, motivo_consulta, juzgado, estado, notas } = body;
  await client.send(new ExecuteStatementCommand({
    ...DB_CONFIG,
    sql: `UPDATE caso SET
            tipo = COALESCE(:tipo, tipo),
            motivo_consulta = COALESCE(:motivo_consulta, motivo_consulta),
            juzgado = COALESCE(:juzgado, juzgado),
            estado = COALESCE(:estado, estado),
            notas = COALESCE(:notas, notas),
            updated_at = NOW()
          WHERE id = :id::uuid`,
    parameters: [
      { name: 'id', value: { stringValue: id } },
      { name: 'tipo', value: tipo ? { stringValue: tipo } : { isNull: true } },
      { name: 'motivo_consulta', value: motivo_consulta ? { stringValue: motivo_consulta } : { isNull: true } },
      { name: 'juzgado', value: juzgado ? { stringValue: juzgado } : { isNull: true } },
      { name: 'estado', value: estado ? { stringValue: estado } : { isNull: true } },
      { name: 'notas', value: notas ? { stringValue: notas } : { isNull: true } },
    ],
  }));
  return response(200, { data: { id, updated: true } });
};

// DELETE /casos/:id
const eliminarCaso = async (id: string) => {
  await client.send(new ExecuteStatementCommand({
    ...DB_CONFIG,
    sql: `DELETE FROM caso WHERE id = :id::uuid`,
    parameters: [{ name: 'id', value: { stringValue: id } }],
  }));
  return response(200, { data: { id, deleted: true } });
};

// HANDLER PRINCIPAL
export const handler = async (event: any): Promise<APIGatewayProxyResult> => {
  try {
    const method = event.requestContext?.http?.method ?? event.httpMethod;
    const id = event.pathParameters?.id;
    const body = event.body ? JSON.parse(event.body) : {};

    if (method === 'GET' && !id) return await listarCasos();
    if (method === 'GET' && id) return await obtenerCaso(id);
    if (method === 'POST') return await crearCaso(body);
    if (method === 'PUT' && id) return await actualizarCaso(id, body);
    if (method === 'DELETE' && id) return await eliminarCaso(id);

    return response(405, { error: 'Método no permitido' });
  } catch (error: any) {
    console.error('Error:', error);
    return response(500, { error: error.message ?? 'Error interno' });
  }
};