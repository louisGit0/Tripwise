/**
 * Seed : catalogue initial de véhicules courants en France.
 *
 * Les valeurs de consommation, de capacité batterie et de volume réservoir
 * sont des estimations indicatives basées sur les fiches constructeur (WLTP).
 * Elles ne constituent pas des données officielles et peuvent varier selon
 * les versions et millésimes.
 *
 * Logique UPSERT : pour chaque véhicule, une recherche par (brand, model, year)
 * est effectuée. Si une ligne existe, elle est mise à jour ; sinon elle est insérée.
 * Le script est donc idempotent.
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register src/seeds/vehicle-models.seed.ts
 *
 * Prérequis : variables DB dans .env, migrations déjà appliquées.
 */

import 'dotenv/config';
import { IsNull } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { VehicleModel, FuelType } from '../vehicles/entities/vehicle-model.entity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VehicleSeed {
  brand: string;
  model: string;
  year: number | null;
  fuelType: FuelType;
  /** L/100km pour les thermiques, kWh/100km pour les électriques (indicatif WLTP) */
  consumption: number;
  /** Capacité brute de la batterie en kWh — null pour les thermiques (indicatif) */
  batteryCapacityKwh: number | null;
  /** Capacité du réservoir en litres — null pour les électriques (indicatif) */
  tankCapacityLiters: number | null;
}

// ---------------------------------------------------------------------------
// Catalogue — 41 véhicules courants en France
// ---------------------------------------------------------------------------

const VEHICLES: VehicleSeed[] = [
  // ── Renault ──────────────────────────────────────────────────────────────
  {
    brand: 'Renault', model: 'Clio V 1.0 TCe 90', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.4,
    batteryCapacityKwh: null, tankCapacityLiters: 40,
  },
  {
    brand: 'Renault', model: 'Clio V 1.5 dCi 85', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 4.1,
    batteryCapacityKwh: null, tankCapacityLiters: 40,
  },
  {
    brand: 'Renault', model: 'Zoé R135', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 17.2,
    batteryCapacityKwh: 52, tankCapacityLiters: null,
  },
  {
    brand: 'Renault', model: 'Megane E-Tech Electric', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 16.1,
    batteryCapacityKwh: 60, tankCapacityLiters: null,
  },
  {
    brand: 'Renault', model: 'Captur 1.0 TCe 90', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.8,
    batteryCapacityKwh: null, tankCapacityLiters: 45,
  },
  {
    brand: 'Renault', model: 'Austral 1.2 E-Tech 200', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.6,
    batteryCapacityKwh: null, tankCapacityLiters: 55,
  },

  // ── Peugeot ──────────────────────────────────────────────────────────────
  {
    brand: 'Peugeot', model: '208 1.2 PureTech 75', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.3,
    batteryCapacityKwh: null, tankCapacityLiters: 44,
  },
  {
    brand: 'Peugeot', model: '208 1.5 BlueHDi 100', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 3.9,
    batteryCapacityKwh: null, tankCapacityLiters: 44,
  },
  {
    brand: 'Peugeot', model: 'e-208', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 15.3,
    batteryCapacityKwh: 51, tankCapacityLiters: null,
  },
  {
    brand: 'Peugeot', model: '2008 1.2 PureTech 130', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.2,
    batteryCapacityKwh: null, tankCapacityLiters: 44,
  },
  {
    brand: 'Peugeot', model: 'e-2008', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 16.8,
    batteryCapacityKwh: 54, tankCapacityLiters: null,
  },
  {
    brand: 'Peugeot', model: '308 1.5 BlueHDi 130', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 4.4,
    batteryCapacityKwh: null, tankCapacityLiters: 54,
  },

  // ── Citroën ──────────────────────────────────────────────────────────────
  {
    brand: 'Citroën', model: 'C3 1.2 PureTech 83', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.1,
    batteryCapacityKwh: null, tankCapacityLiters: 44,
  },
  {
    brand: 'Citroën', model: 'ë-C3', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 14.9,
    batteryCapacityKwh: 44, tankCapacityLiters: null,
  },
  {
    brand: 'Citroën', model: 'C5 Aircross 1.5 BlueHDi 130', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 4.8,
    batteryCapacityKwh: null, tankCapacityLiters: 55,
  },

  // ── Dacia ────────────────────────────────────────────────────────────────
  {
    brand: 'Dacia', model: 'Sandero 1.0 TCe 90', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.3,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },
  {
    brand: 'Dacia', model: 'Sandero GPL 1.0 ECO-G 100', year: 2023,
    fuelType: FuelType.GPL, consumption: 6.5,
    batteryCapacityKwh: null, tankCapacityLiters: 40,
  },
  {
    brand: 'Dacia', model: 'Duster 1.0 TCe 100', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.4,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },
  {
    brand: 'Dacia', model: 'Spring Electric', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 13.9,
    batteryCapacityKwh: 27, tankCapacityLiters: null,
  },

  // ── Volkswagen ───────────────────────────────────────────────────────────
  {
    brand: 'Volkswagen', model: 'Golf 8 1.0 eTSI 110', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.7,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },
  {
    brand: 'Volkswagen', model: 'Golf 8 2.0 TDI 115', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 4.4,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },
  {
    brand: 'Volkswagen', model: 'ID.3 Pro', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 15.4,
    batteryCapacityKwh: 58, tankCapacityLiters: null,
  },
  {
    brand: 'Volkswagen', model: 'ID.4 Pro', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 17.3,
    batteryCapacityKwh: 77, tankCapacityLiters: null,
  },
  {
    brand: 'Volkswagen', model: 'Polo 1.0 TSI 95', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.2,
    batteryCapacityKwh: null, tankCapacityLiters: 40,
  },

  // ── Toyota ───────────────────────────────────────────────────────────────
  {
    brand: 'Toyota', model: 'Yaris 1.5 Hybrid', year: 2023,
    fuelType: FuelType.SP95, consumption: 4.6,
    batteryCapacityKwh: null, tankCapacityLiters: 36,
  },
  {
    brand: 'Toyota', model: 'Corolla 1.8 Hybrid', year: 2023,
    fuelType: FuelType.SP95, consumption: 5.0,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },
  {
    brand: 'Toyota', model: 'Yaris Cross 1.5 Hybrid', year: 2023,
    fuelType: FuelType.SP95, consumption: 5.1,
    batteryCapacityKwh: null, tankCapacityLiters: 40,
  },
  {
    brand: 'Toyota', model: 'bZ4X', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 18.0,
    batteryCapacityKwh: 71, tankCapacityLiters: null,
  },

  // ── Tesla ────────────────────────────────────────────────────────────────
  {
    brand: 'Tesla', model: 'Model 3 RWD', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 14.9,
    batteryCapacityKwh: 60, tankCapacityLiters: null,
  },
  {
    brand: 'Tesla', model: 'Model 3 Long Range AWD', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 15.7,
    batteryCapacityKwh: 75, tankCapacityLiters: null,
  },
  {
    brand: 'Tesla', model: 'Model Y RWD', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 15.6,
    batteryCapacityKwh: 60, tankCapacityLiters: null,
  },
  {
    brand: 'Tesla', model: 'Model Y Long Range AWD', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 17.2,
    batteryCapacityKwh: 75, tankCapacityLiters: null,
  },

  // ── Hyundai ──────────────────────────────────────────────────────────────
  {
    brand: 'Hyundai', model: 'Kona Electric 64 kWh', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 15.2,
    batteryCapacityKwh: 64, tankCapacityLiters: null,
  },
  {
    brand: 'Hyundai', model: 'Tucson 1.6 T-GDi Hybrid', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.0,
    batteryCapacityKwh: null, tankCapacityLiters: 54,
  },

  // ── Kia ──────────────────────────────────────────────────────────────────
  {
    brand: 'Kia', model: 'Niro EV', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 15.0,
    batteryCapacityKwh: 65, tankCapacityLiters: null,
  },
  {
    brand: 'Kia', model: 'Sportage 1.6 T-GDi MHEV', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 7.2,
    batteryCapacityKwh: null, tankCapacityLiters: 54,
  },

  // ── BMW ──────────────────────────────────────────────────────────────────
  {
    brand: 'BMW', model: 'iX1 eDrive20', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 17.5,
    batteryCapacityKwh: 65, tankCapacityLiters: null,
  },
  {
    brand: 'BMW', model: '118i', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.0,
    batteryCapacityKwh: null, tankCapacityLiters: 40,
  },

  // ── Fiat ─────────────────────────────────────────────────────────────────
  {
    brand: 'Fiat', model: '500e', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 14.2,
    batteryCapacityKwh: 42, tankCapacityLiters: null,
  },
  {
    brand: 'Fiat', model: 'Panda 1.0 Hybrid', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.1,
    batteryCapacityKwh: null, tankCapacityLiters: 35,
  },

  // ── Opel ─────────────────────────────────────────────────────────────────
  {
    brand: 'Opel', model: 'Corsa-e', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 15.3,
    batteryCapacityKwh: 50, tankCapacityLiters: null,
  },
  {
    brand: 'Opel', model: 'Mokka-e', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 17.1,
    batteryCapacityKwh: 50, tankCapacityLiters: null,
  },
];

// ---------------------------------------------------------------------------
// Script principal — UPSERT par (brand, model, year)
// ---------------------------------------------------------------------------

async function main() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(VehicleModel);

  let inserted = 0;
  let updated = 0;

  for (const v of VEHICLES) {
    const yearFilter = v.year === null ? IsNull() : v.year;
    const existing = await repo.findOneBy({ brand: v.brand, model: v.model, year: yearFilter });

    if (existing) {
      existing.consumption       = v.consumption;
      existing.batteryCapacityKwh = v.batteryCapacityKwh;
      existing.tankCapacityLiters = v.tankCapacityLiters;
      await repo.save(existing);
      updated++;
    } else {
      const vm = new VehicleModel();
      vm.brand               = v.brand;
      vm.model               = v.model;
      vm.year                = v.year;
      vm.fuelType            = v.fuelType;
      vm.consumption         = v.consumption;
      vm.batteryCapacityKwh  = v.batteryCapacityKwh;
      vm.tankCapacityLiters  = v.tankCapacityLiters;
      await repo.save(vm);
      inserted++;
    }
  }

  console.log(`✅  Seed terminé : ${inserted} inséré(s), ${updated} mis à jour.`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌  Erreur lors du seed :', err);
  process.exit(1);
});
