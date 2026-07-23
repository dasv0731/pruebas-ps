/**
 * Guardián de integridad de los baremos CDI.
 *
 * Un baremo correcto cumple, en CADA columna y leyendo de Pc bajo a Pc alto:
 *   - cada celda: min <= max;
 *   - entre celdas NO vacías consecutivas: la puntuación directa es estrictamente
 *     creciente y sin solape (celda.min > max de la celda no vacía anterior).
 * Si esto se rompe, una PD menor podría obtener un percentil mayor (percentil
 * invertido) o una PD caer en dos percentiles — inaceptable en contexto pericial.
 *
 * Uso: `npm run validate:baremos` (sale con código 1 si hay problemas).
 * Este check habría detectado la transposición del bloque Pc95-99 de Autoestima.
 */
import { BAREM_TOTAL, BAREM_DISFORIA, BAREM_AUTOESTIMA } from './baremos';
import { BaremTable, TableColumn } from './types';

const COLUMNS: TableColumn[] = ['V7-8', 'V9-10', 'V11-15', 'M7-8', 'M9-10', 'M11-15'];

export function findBaremProblems(table: BaremTable): string[] {
  const problems: string[] = [];
  for (const col of COLUMNS) {
    let prev: { pc: number; min: number; max: number } | null = null;
    for (const rowData of table.rows) {
      const cell = rowData.cells[col];
      if (cell.min == null || cell.max == null) continue;
      if (cell.min > cell.max) {
        problems.push(`[${table.name} ${col}] Pc${rowData.pc}: celda invertida min>max (${cell.min},${cell.max})`);
      }
      if (prev && cell.min <= prev.max) {
        problems.push(
          `[${table.name} ${col}] Pc${prev.pc}=(${prev.min},${prev.max}) -> Pc${rowData.pc}=(${cell.min},${cell.max}): ` +
            (cell.max < prev.min
              ? 'NO MONOTONICO (Pc mayor con PD menor)'
              : `SOLAPE/EMPATE (PD ${cell.min}..${Math.min(cell.max, prev.max)} en ambos)`),
        );
      }
      prev = { pc: rowData.pc, min: cell.min, max: cell.max };
    }
  }
  return problems;
}

export function findAllBaremProblems(): string[] {
  return [BAREM_TOTAL, BAREM_DISFORIA, BAREM_AUTOESTIMA].flatMap(findBaremProblems);
}

// Ejecución directa como script (tsx): imprime y sale 1 si hay problemas.
const problems = findAllBaremProblems();
if (problems.length > 0) {
  console.error(`❌ Baremos CDI: ${problems.length} problema(s) de monotonía/solape:`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
} else {
  console.log('✅ Baremos CDI: monótonos y sin solapes en todas las columnas.');
}
