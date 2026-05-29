/**
 * Script d'import ADEME — catalogue de véhicules officiels.
 *
 * Source : ADEME "Données environnementales et économiques sur les véhicules"
 * disponible sur data.gouv.fr.
 *
 * TODO : mettre à jour ADEME_CSV_URL avec l'URL directe du fichier CSV actuel.
 *   → https://data.ademe.fr/datasets/ademe-car-labelling
 *   → Chercher le fichier "Données Eco2mix - Parc automobile" ou équivalent.
 *   → Exemple : https://data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling/raw
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register src/scripts/import-ademe.ts
 *
 * Prérequis : variables DB dans .env, migrations déjà appliquées.
 *
 * Logique UPSERT : pour chaque entrée, recherche par (brand, model, year).
 * Si une ligne existe elle est mise à jour (consommation, batterie, réservoir).
 * Sinon une nouvelle ligne est insérée.
 * Le script est idempotent.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { IsNull } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { VehicleModel, FuelType } from '../vehicles/entities/vehicle-model.entity';

// ---------------------------------------------------------------------------
// TODO: Update this URL to the current ADEME CSV dataset URL.
// ---------------------------------------------------------------------------
const ADEME_CSV_URL = 'TODO_REPLACE_WITH_ACTUAL_ADEME_CSV_URL';

// ---------------------------------------------------------------------------
// Mapping des codes carburant ADEME → FuelType interne
// À ajuster selon le schéma réel du fichier CSV ADEME.
// ---------------------------------------------------------------------------
function mapFuelType(ademeCode: string): FuelType | null {
  const code = ademeCode.trim().toUpperCase();
  switch (code) {
    case 'ES':
    case 'ESSENCE':
    case 'SP95':
      return FuelType.SP95;
    case 'SP95-E10':
    case 'E10':
      return FuelType.SP95_E10;
    case 'SP98':
      return FuelType.SP98;
    case 'GO':
    case 'DIESEL':
    case 'GAZOLE':
      return FuelType.DIESEL;
    case 'E85':
    case 'SUPERETHANOL':
      return FuelType.E85;
    case 'GPL':
    case 'GPLc':
      return FuelType.GPL;
    case 'EL':
    case 'ELEC':
    case 'ÉLECTRIQUE':
    case 'ELECTRIQUE':
      return FuelType.ELECTRIC;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Téléchargement du CSV ADEME
// ---------------------------------------------------------------------------
async function downloadCsv(url: string, destPath: string): Promise<void> {
  console.log(`Téléchargement du CSV ADEME depuis : ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Échec du téléchargement : HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(`CSV enregistré : ${destPath}`);
}

// ---------------------------------------------------------------------------
// Lecture et parsing du CSV
// ---------------------------------------------------------------------------
interface AdemeRow {
  brand: string;
  model: string;
  year: number | null;
  fuelTypeRaw: string;
  consumption: number;   // L/100km ou kWh/100km
  batteryKwh: number | null;
  tankLiters: number | null;
}

async function parseCsv(filePath: string): Promise<AdemeRow[]> {
  const rows: AdemeRow[] = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  let lineIndex = 0;

  for await (const line of rl) {
    if (lineIndex === 0) {
      // TODO: vérifier les noms exacts des colonnes dans le fichier ADEME
      // Noms de colonnes indicatifs — à adapter après avoir inspecté le CSV réel.
      headers = line.split(';').map((h) => h.trim().replace(/^"|"$/g, ''));
      lineIndex++;
      continue;
    }

    const values = line.split(';').map((v) => v.trim().replace(/^"|"$/g, ''));
    const get = (col: string) => values[headers.indexOf(col)] ?? '';

    // TODO: remplacer les noms de colonnes par ceux du fichier ADEME réel
    const brand = get('Marque') || get('lib_mrq_utac') || get('marque');
    const model = get('Modèle') || get('lib_mod_doss') || get('modele');
    const yearStr = get('Année') || get('annee') || '';
    const fuelTypeRaw = get('Carburant') || get('lib_carb') || get('energie');
    const consumptionStr = get('Consommation mixte') || get('conso_urb') || get('consommation');
    const batteryStr = get('Capacité batterie') || get('cap_bat') || '';
    const tankStr = get('Réservoir') || get('cap_res') || '';

    if (!brand || !model || !fuelTypeRaw || !consumptionStr) {
      lineIndex++;
      continue;
    }

    const consumption = parseFloat(consumptionStr.replace(',', '.'));
    if (isNaN(consumption) || consumption <= 0) {
      lineIndex++;
      continue;
    }

    const year = yearStr ? parseInt(yearStr, 10) : null;
    const batteryKwh = batteryStr ? parseFloat(batteryStr.replace(',', '.')) || null : null;
    const tankLiters = tankStr ? parseFloat(tankStr.replace(',', '.')) || null : null;

    rows.push({
      brand: brand.trim(),
      model: model.trim(),
      year: year && !isNaN(year) ? year : null,
      fuelTypeRaw,
      consumption,
      batteryKwh,
      tankLiters,
    });

    lineIndex++;
  }

  console.log(`${rows.length} lignes parsées depuis le CSV`);
  return rows;
}

// ---------------------------------------------------------------------------
// Upsert dans la base de données
// ---------------------------------------------------------------------------
async function upsertVehicles(rows: AdemeRow[]): Promise<void> {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(VehicleModel);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const fuelType = mapFuelType(row.fuelTypeRaw);
    if (!fuelType) {
      skipped++;
      continue;
    }

    // Recherche par (brand, model, year) — UPSERT idempotent
    const yearCondition = row.year ? { year: row.year } : { year: IsNull() };
    const existing = await repo.findOneBy({
      brand: row.brand,
      model: row.model,
      ...yearCondition,
    });

    if (existing) {
      existing.consumption = row.consumption;
      existing.fuelType = fuelType;
      if (row.batteryKwh !== null) existing.batteryCapacityKwh = row.batteryKwh;
      if (row.tankLiters !== null) existing.tankCapacityLiters = row.tankLiters;
      await repo.save(existing);
      updated++;
    } else {
      const vehicle = repo.create({
        brand: row.brand,
        model: row.model,
        year: row.year ?? undefined,
        fuelType,
        consumption: row.consumption,
        batteryCapacityKwh: row.batteryKwh ?? undefined,
        tankCapacityLiters: row.tankLiters ?? undefined,
      });
      await repo.save(vehicle);
      inserted++;
    }
  }

  console.log(`\nRésultat de l'import ADEME :`);
  console.log(`  Insérés  : ${inserted}`);
  console.log(`  Mis à jour : ${updated}`);
  console.log(`  Ignorés  : ${skipped} (type carburant non reconnu)`);

  await AppDataSource.destroy();
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  if (ADEME_CSV_URL === 'TODO_REPLACE_WITH_ACTUAL_ADEME_CSV_URL') {
    console.error('ERREUR : ADEME_CSV_URL non configurée.');
    console.error('Modifier la constante ADEME_CSV_URL dans ce fichier.');
    console.error('URL de référence : https://data.ademe.fr/datasets/ademe-car-labelling');
    process.exit(1);
  }

  const tmpPath = path.join(__dirname, '../../tmp_ademe.csv');

  try {
    await downloadCsv(ADEME_CSV_URL, tmpPath);
    const rows = await parseCsv(tmpPath);
    await upsertVehicles(rows);
  } finally {
    // Nettoyage du fichier temporaire
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
  }
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
