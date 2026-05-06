import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();

/**
 * Service que invoca la Lambda de scoring del CDI en el backend.
 * La Lambda calcula puntuaciones, baremación, clasificación, y persiste
 * el AssessmentScoring correspondiente.
 */
@Injectable({ providedIn: 'root' })
export class CdiScoringService {
  /**
   * Invoca scoreCdiSession para una sesión autenticada (flujo privado).
   * La Lambda lee la sesión desde DynamoDB y procesa.
   */
  async scoreAuthenticated(sessionId: string): Promise<any> {
    const result = await (client.queries as any).scoreCdiSession({
      sessionId,
    });

    if (result.errors?.length) {
      throw new Error(result.errors.map((e: any) => e.message).join(', '));
    }

    // La Lambda devuelve a.json() que llega como string en `data`
    const parsed =
      typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

    if (!parsed?.success) {
      throw new Error(parsed?.error || 'Error al calcular scoring del CDI');
    }

    return parsed;
  }

  /**
   * Invoca scoreCdiSession desde el flujo público (evaluado).
   * Usa el mismo cliente pero con apiKey.
   */
  async scorePublic(sessionId: string): Promise<any> {
    const publicClient = generateClient<Schema>({ authMode: 'apiKey' });
    const result = await (publicClient.queries as any).scoreCdiSession({
      sessionId,
    });

    if (result.errors?.length) {
      throw new Error(result.errors.map((e: any) => e.message).join(', '));
    }

    const parsed =
      typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

    if (!parsed?.success) {
      throw new Error(parsed?.error || 'Error al calcular scoring del CDI');
    }

    return parsed;
  }
}