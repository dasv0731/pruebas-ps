import { BaremTable, TableColumn, NormedScore, Sex, AgeGroup } from './types';

/**
 * Determina el grupo de edad según años cumplidos.
 * Rango baremado: 7-15 años. Fuera de eso devuelve null.
 */
export function resolveAgeGroup(ageYears: number): AgeGroup | null {
  if (ageYears < 7 || ageYears > 15) return null;
  if (ageYears <= 8) return '7-8';
  if (ageYears <= 10) return '9-10';
  return '11-15';
}

/**
 * Construye el nombre de columna del baremo a partir de sexo y grupo de edad.
 */
export function resolveTableColumn(sex: Sex, ageGroup: AgeGroup): TableColumn {
  const prefix = sex === 'MALE' ? 'V' : 'M';
  return `${prefix}${ageGroup}` as TableColumn;
}

/**
 * Busca el percentil y T correspondientes a una puntuación directa en la columna dada.
 *
 * Reglas de lookup (según acuerdo con el manual TEA):
 *
 * 1. Se recorren las filas de la tabla de menor a mayor percentil.
 * 2. Se ignoran celdas vacías (min/max null).
 * 3. Si la puntuación cae dentro del rango de una celda (min <= score <= max),
 *    se asigna ese percentil.
 * 4. Si ninguna fila contiene la puntuación exactamente:
 *    - Si es menor que el mínimo observado en la columna, se asigna el percentil
 *      más bajo disponible.
 *    - Si es mayor que el máximo observado, se asigna Pc 99 con los valores z/T
 *      de la última fila.
 * 5. Si la puntuación queda "en medio" de dos filas sin coincidir (porque la
 *    distribución es discreta), se toma el percentil inmediatamente inferior
 *    que no exceda la puntuación.
 */
export function lookupScore(
  table: BaremTable,
  column: TableColumn,
  rawScore: number,
): NormedScore {
  // Filtrar filas que tienen celda válida en esta columna
  const validRows = table.rows.filter(
    (row) => row.cells[column].min !== null && row.cells[column].max !== null,
  );

  if (validRows.length === 0) {
    throw new Error(
      `No hay datos de baremación para la columna ${column} en la tabla ${table.name}`,
    );
  }

  // 1. Buscar fila que contenga exactamente la puntuación
  for (const row of validRows) {
    const cell = row.cells[column];
    if (rawScore >= cell.min! && rawScore <= cell.max!) {
      return { pc: row.pc, t: row.t };
    }
  }

  // 2. Si la puntuación es menor que el mínimo observado,
  //    asignar el percentil más bajo disponible.
  const firstRow = validRows[0];
  const firstCellMin = firstRow.cells[column].min!;
  if (rawScore < firstCellMin) {
    return { pc: firstRow.pc, t: firstRow.t };
  }

  // 3. Si la puntuación es mayor que el máximo observado,
  //    asignar el percentil más alto (típicamente Pc 99).
  const lastRow = validRows[validRows.length - 1];
  const lastCellMax = lastRow.cells[column].max!;
  if (rawScore > lastCellMax) {
    return { pc: lastRow.pc, t: lastRow.t };
  }

  // 4. Si la puntuación cae en un "hueco" entre filas (distribución discreta
  //    con celdas '--' intermedias), tomar el percentil inmediatamente inferior
  //    que no exceda la puntuación.
  let bestMatch = firstRow;
  for (const row of validRows) {
    if (row.cells[column].max! <= rawScore) {
      bestMatch = row;
    }
  }
  return { pc: bestMatch.pc, t: bestMatch.t };
}