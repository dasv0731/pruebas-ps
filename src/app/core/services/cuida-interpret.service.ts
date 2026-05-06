import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();

@Injectable({ providedIn: 'root' })
export class CuidaInterpretService {
  async interpret(sessionId: string): Promise<any> {
    const result = await (client.queries as any).interpretCuidaSession({ sessionId });

    if (result.errors?.length) {
      throw new Error(result.errors.map((e: any) => e.message).join(', '));
    }

    return typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
  }
}
