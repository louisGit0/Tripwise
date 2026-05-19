/**
 * Seed : catalogue initial de véhicules courants en France.
 *
 * Les valeurs de consommation sont des estimations indicatives
 * basées sur les moyennes constructeur (WLTP ou NEDC) et les retours
 * terrain. Elles ne constituent pas des données officielles.
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register src/seeds/vehicle-models.seed.ts
 *
 * Prérequis : variables DB dans .env, migrations déjà appliquées.
 */

import 'dotenv/config';
import { AppDataSource } from '../database/data-source';
import { VehicleModel, FuelType } from '../vehicles/entities/vehicle-model.entity';

// ---------------------------------------------------------------------------
// Données du catalogue
// ---------------------------------------------------------------------------

type VehicleSeed = Pick<VehicleModel, 'brand' | 'model' | 'fuelType' | 'consumption'> & {
  year: number | null;
};

const VEHICLES: VehicleSeed[] = [
  // ── Renault ──────────────────────────────────────────────────────────────
  { brand: 'Renault', model: 'Clio V 1.0 TCe 90',    year: 2023, fuelType: FuelType.SP95_E10, consumption: 5.4 },
  { brand: 'Renault', model: 'Clio V 1.5 dCi 85',    year: 2023, fuelType: FuelType.DIESEL,   consumption: 4.1 },
  { brand: 'Renault', model: 'Zoé R135',              year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 17.2 },
  { brand: 'Renault', model: 'Megane E-Tech Electric',year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 16.1 },
  { brand: 'Renault', model: 'Captur 1.0 TCe 90',    year: 2023, fuelType: FuelType.SP95_E10, consumption: 5.8 },
  { brand: 'Renault', model: 'Austral 1.2 E-Tech 200',year: 2023, fuelType: FuelType.SP95_E10, consumption: 5.6 },

  // ── Peugeot ──────────────────────────────────────────────────────────────
  { brand: 'Peugeot', model: '208 1.2 PureTech 75',  year: 2023, fuelType: FuelType.SP95_E10, consumption: 5.3 },
  { brand: 'Peugeot', model: '208 1.5 BlueHDi 100',  year: 2023, fuelType: FuelType.DIESEL,   consumption: 3.9 },
  { brand: 'Peugeot', model: 'e-208',                 year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 15.3 },
  { brand: 'Peugeot', model: '2008 1.2 PureTech 130',year: 2023, fuelType: FuelType.SP95_E10, consumption: 6.2 },
  { brand: 'Peugeot', model: 'e-2008',                year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 16.8 },
  { brand: 'Peugeot', model: '308 1.5 BlueHDi 130',  year: 2023, fuelType: FuelType.DIESEL,   consumption: 4.4 },

  // ── Citroën ──────────────────────────────────────────────────────────────
  { brand: 'Citroën', model: 'C3 1.2 PureTech 83',   year: 2023, fuelType: FuelType.SP95_E10, consumption: 5.1 },
  { brand: 'Citroën', model: 'ë-C3',                  year: 2024, fuelType: FuelType.ELECTRIC,  consumption: 14.9 },
  { brand: 'Citroën', model: 'C5 Aircross 1.5 BlueHDi 130', year: 2023, fuelType: FuelType.DIESEL, consumption: 4.8 },

  // ── Dacia ────────────────────────────────────────────────────────────────
  { brand: 'Dacia', model: 'Sandero 1.0 TCe 90',     year: 2023, fuelType: FuelType.SP95_E10, consumption: 5.3 },
  { brand: 'Dacia', model: 'Sandero GPL 1.0 ECO-G 100', year: 2023, fuelType: FuelType.GPL,  consumption: 6.5 },
  { brand: 'Dacia', model: 'Duster 1.0 TCe 100',     year: 2023, fuelType: FuelType.SP95_E10, consumption: 6.4 },
  { brand: 'Dacia', model: 'Spring Electric',         year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 13.9 },

  // ── Volkswagen ───────────────────────────────────────────────────────────
  { brand: 'Volkswagen', model: 'Golf 8 1.0 eTSI 110', year: 2023, fuelType: FuelType.SP95_E10, consumption: 5.7 },
  { brand: 'Volkswagen', model: 'Golf 8 2.0 TDI 115',  year: 2023, fuelType: FuelType.DIESEL,   consumption: 4.4 },
  { brand: 'Volkswagen', model: 'ID.3 Pro',             year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 15.4 },
  { brand: 'Volkswagen', model: 'ID.4 Pro',             year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 17.3 },
  { brand: 'Volkswagen', model: 'Polo 1.0 TSI 95',     year: 2023, fuelType: FuelType.SP95_E10, consumption: 5.2 },

  // ── Toyota ───────────────────────────────────────────────────────────────
  { brand: 'Toyota', model: 'Yaris 1.5 Hybrid',       year: 2023, fuelType: FuelType.SP95,    consumption: 4.6 },
  { brand: 'Toyota', model: 'Corolla 1.8 Hybrid',     year: 2023, fuelType: FuelType.SP95,    consumption: 5.0 },
  { brand: 'Toyota', model: 'Yaris Cross 1.5 Hybrid', year: 2023, fuelType: FuelType.SP95,    consumption: 5.1 },
  { brand: 'Toyota', model: 'bZ4X',                   year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 18.0 },

  // ── Tesla ────────────────────────────────────────────────────────────────
  { brand: 'Tesla', model: 'Model 3 RWD',             year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 14.9 },
  { brand: 'Tesla', model: 'Model 3 Long Range AWD',  year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 15.7 },
  { brand: 'Tesla', model: 'Model Y RWD',             year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 15.6 },
  { brand: 'Tesla', model: 'Model Y Long Range AWD',  year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 17.2 },

  // ── Hyundai ──────────────────────────────────────────────────────────────
  { brand: 'Hyundai', model: 'Kona Electric 64 kWh',  year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 15.2 },
  { brand: 'Hyundai', model: 'Tucson 1.6 T-GDi Hybrid', year: 2023, fuelType: FuelType.SP95_E10, consumption: 6.0 },

  // ── Kia ──────────────────────────────────────────────────────────────────
  { brand: 'Kia', model: 'Niro EV',                   year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 15.0 },
  { brand: 'Kia', model: 'Sportage 1.6 T-GDi MHEV',  year: 2023, fuelType: FuelType.SP95_E10, consumption: 7.2 },

  // ── BMW ──────────────────────────────────────────────────────────────────
  { brand: 'BMW', model: 'iX1 eDrive20',              year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 17.5 },
  { brand: 'BMW', model: '118i',                      year: 2023, fuelType: FuelType.SP95_E10, consumption: 6.0 },

  // ── Fiat ─────────────────────────────────────────────────────────────────
  { brand: 'Fiat', model: '500e',                     year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 14.2 },
  { brand: 'Fiat', model: 'Panda 1.0 Hybrid',         year: 2023, fuelType: FuelType.SP95_E10, consumption: 5.1 },

  // ── Opel / Vauxhall ──────────────────────────────────────────────────────
  { brand: 'Opel', model: 'Corsa-e',                  year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 15.3 },
  { brand: 'Opel', model: 'Mokka-e',                  year: 2023, fuelType: FuelType.ELECTRIC,  consumption: 17.1 },
];

// ---------------------------------------------------------------------------
// Script principal
// ---------------------------------------------------------------------------

async function main() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(VehicleModel);

  const existing = await repo.count();
  if (existing > 0) {
    console.log(`⚠️  ${existing} véhicule(s) déjà présent(s) — seed ignoré.`);
    await AppDataSource.destroy();
    return;
  }

  const entities = VEHICLES.map((v) => {
    const vm = new VehicleModel();
    vm.brand = v.brand;
    vm.model = v.model;
    vm.year = v.year;
    vm.fuelType = v.fuelType;
    vm.consumption = v.consumption;
    return vm;
  });

  await repo.save(entities);
  console.log(`✅  ${entities.length} véhicules insérés dans vehicle_models.`);

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌  Erreur lors du seed :', err);
  process.exit(1);
});
