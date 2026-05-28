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

  // ── Renault (suite) ───────────────────────────────────────────────────────
  {
    brand: 'Renault', model: 'Twingo 1.0 SCe 65', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.2,
    batteryCapacityKwh: null, tankCapacityLiters: 35,
  },
  {
    brand: 'Renault', model: 'Kangoo Van 1.5 Blue dCi 95', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 4.9,
    batteryCapacityKwh: null, tankCapacityLiters: 60,
  },
  {
    brand: 'Renault', model: 'Scenic E-Tech Electric', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 15.7,
    batteryCapacityKwh: 87, tankCapacityLiters: null,
  },
  {
    brand: 'Renault', model: 'Arkana 1.3 TCe 140', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.0,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },
  {
    brand: 'Renault', model: 'Symbioz 1.6 E-Tech 200', year: 2024,
    fuelType: FuelType.SP95, consumption: 4.8,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },

  // ── Peugeot (suite) ───────────────────────────────────────────────────────
  {
    brand: 'Peugeot', model: '3008 1.5 BlueHDi 130', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 5.0,
    batteryCapacityKwh: null, tankCapacityLiters: 60,
  },
  {
    brand: 'Peugeot', model: '5008 1.5 BlueHDi 130', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 5.2,
    batteryCapacityKwh: null, tankCapacityLiters: 60,
  },
  {
    brand: 'Peugeot', model: '408 1.2 PureTech 130', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.9,
    batteryCapacityKwh: null, tankCapacityLiters: 54,
  },
  {
    brand: 'Peugeot', model: 'e-308', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 14.7,
    batteryCapacityKwh: 54, tankCapacityLiters: null,
  },
  {
    brand: 'Peugeot', model: 'e-3008', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 16.2,
    batteryCapacityKwh: 73, tankCapacityLiters: null,
  },

  // ── Citroën (suite) ───────────────────────────────────────────────────────
  {
    brand: 'Citroën', model: 'C4 1.2 PureTech 130', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.9,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },
  {
    brand: 'Citroën', model: 'ë-C4', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 15.1,
    batteryCapacityKwh: 54, tankCapacityLiters: null,
  },
  {
    brand: 'Citroën', model: 'Berlingo 1.5 BlueHDi 100', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 4.8,
    batteryCapacityKwh: null, tankCapacityLiters: 60,
  },
  {
    brand: 'Citroën', model: 'C3 Aircross 1.2 PureTech 130', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.1,
    batteryCapacityKwh: null, tankCapacityLiters: 45,
  },

  // ── Dacia (suite) ─────────────────────────────────────────────────────────
  {
    brand: 'Dacia', model: 'Jogger 1.0 TCe 100', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.0,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },
  {
    brand: 'Dacia', model: 'Logan 1.0 SCe 65', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.4,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },
  {
    brand: 'Dacia', model: 'Bigster 1.2 TCe 130', year: 2025,
    fuelType: FuelType.SP95_E10, consumption: 6.5,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },

  // ── Volkswagen (suite) ────────────────────────────────────────────────────
  {
    brand: 'Volkswagen', model: 'T-Roc 1.5 TSI 150', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.2,
    batteryCapacityKwh: null, tankCapacityLiters: 55,
  },
  {
    brand: 'Volkswagen', model: 'Tiguan 1.5 eTSI 150', year: 2024,
    fuelType: FuelType.SP95_E10, consumption: 6.4,
    batteryCapacityKwh: null, tankCapacityLiters: 60,
  },
  {
    brand: 'Volkswagen', model: 'Passat 2.0 TDI 150', year: 2024,
    fuelType: FuelType.DIESEL, consumption: 5.2,
    batteryCapacityKwh: null, tankCapacityLiters: 66,
  },
  {
    brand: 'Volkswagen', model: 'ID.5 Pro', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 18.5,
    batteryCapacityKwh: 77, tankCapacityLiters: null,
  },

  // ── Mercedes-Benz ─────────────────────────────────────────────────────────
  {
    brand: 'Mercedes-Benz', model: 'A 180 d', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 4.4,
    batteryCapacityKwh: null, tankCapacityLiters: 51,
  },
  {
    brand: 'Mercedes-Benz', model: 'C 220 d', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 4.9,
    batteryCapacityKwh: null, tankCapacityLiters: 66,
  },
  {
    brand: 'Mercedes-Benz', model: 'EQA 250', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 16.3,
    batteryCapacityKwh: 70, tankCapacityLiters: null,
  },
  {
    brand: 'Mercedes-Benz', model: 'EQB 350 4MATIC', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 18.0,
    batteryCapacityKwh: 70, tankCapacityLiters: null,
  },
  {
    brand: 'Mercedes-Benz', model: 'GLC 220 d 4MATIC', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 6.0,
    batteryCapacityKwh: null, tankCapacityLiters: 70,
  },
  {
    brand: 'Mercedes-Benz', model: 'A 200', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.1,
    batteryCapacityKwh: null, tankCapacityLiters: 51,
  },

  // ── Audi ──────────────────────────────────────────────────────────────────
  {
    brand: 'Audi', model: 'A3 Sportback 30 TFSI', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.8,
    batteryCapacityKwh: null, tankCapacityLiters: 45,
  },
  {
    brand: 'Audi', model: 'Q3 35 TFSI', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.3,
    batteryCapacityKwh: null, tankCapacityLiters: 60,
  },
  {
    brand: 'Audi', model: 'Q4 e-tron 40', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 17.5,
    batteryCapacityKwh: 82, tankCapacityLiters: null,
  },
  {
    brand: 'Audi', model: 'A4 Avant 35 TDI', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 5.3,
    batteryCapacityKwh: null, tankCapacityLiters: 58,
  },

  // ── Ford ──────────────────────────────────────────────────────────────────
  {
    brand: 'Ford', model: 'Puma 1.0 EcoBoost 125', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.5,
    batteryCapacityKwh: null, tankCapacityLiters: 42,
  },
  {
    brand: 'Ford', model: 'Focus 1.0 EcoBoost 125', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.0,
    batteryCapacityKwh: null, tankCapacityLiters: 52,
  },
  {
    brand: 'Ford', model: 'Mustang Mach-E Extended RWD', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 19.0,
    batteryCapacityKwh: 91, tankCapacityLiters: null,
  },
  {
    brand: 'Ford', model: 'Kuga 1.5 EcoBoost 150', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.8,
    batteryCapacityKwh: null, tankCapacityLiters: 56,
  },
  {
    brand: 'Ford', model: 'Explorer 1.5 EcoBoost 457', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 19.0,
    batteryCapacityKwh: 79, tankCapacityLiters: null,
  },

  // ── SEAT ──────────────────────────────────────────────────────────────────
  {
    brand: 'SEAT', model: 'Ibiza 1.0 TSI 95', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.4,
    batteryCapacityKwh: null, tankCapacityLiters: 40,
  },
  {
    brand: 'SEAT', model: 'Arona 1.0 TSI 110', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.6,
    batteryCapacityKwh: null, tankCapacityLiters: 40,
  },
  {
    brand: 'SEAT', model: 'Leon 2.0 TDI 115', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 4.5,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },

  // ── Cupra ─────────────────────────────────────────────────────────────────
  {
    brand: 'Cupra', model: 'Born 58 kWh', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 15.8,
    batteryCapacityKwh: 58, tankCapacityLiters: null,
  },
  {
    brand: 'Cupra', model: 'Formentor 1.5 TSI 150', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.2,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },
  {
    brand: 'Cupra', model: 'Born 77 kWh', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 16.5,
    batteryCapacityKwh: 77, tankCapacityLiters: null,
  },

  // ── Skoda ─────────────────────────────────────────────────────────────────
  {
    brand: 'Skoda', model: 'Fabia 1.0 TSI 95', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.0,
    batteryCapacityKwh: null, tankCapacityLiters: 40,
  },
  {
    brand: 'Skoda', model: 'Octavia 2.0 TDI 115', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 4.6,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },
  {
    brand: 'Skoda', model: 'Karoq 1.5 TSI 150', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.5,
    batteryCapacityKwh: null, tankCapacityLiters: 55,
  },
  {
    brand: 'Skoda', model: 'Enyaq iV 80', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 17.5,
    batteryCapacityKwh: 82, tankCapacityLiters: null,
  },

  // ── Nissan ────────────────────────────────────────────────────────────────
  {
    brand: 'Nissan', model: 'Juke 1.0 DIG-T 114', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.0,
    batteryCapacityKwh: null, tankCapacityLiters: 47,
  },
  {
    brand: 'Nissan', model: 'Qashqai 1.3 DIG-T 140', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.4,
    batteryCapacityKwh: null, tankCapacityLiters: 55,
  },
  {
    brand: 'Nissan', model: 'Leaf 40 kWh', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 16.5,
    batteryCapacityKwh: 40, tankCapacityLiters: null,
  },
  {
    brand: 'Nissan', model: 'Ariya 87 kWh', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 19.0,
    batteryCapacityKwh: 87, tankCapacityLiters: null,
  },

  // ── Honda ─────────────────────────────────────────────────────────────────
  {
    brand: 'Honda', model: 'Jazz 1.5 e:HEV', year: 2023,
    fuelType: FuelType.SP95, consumption: 4.5,
    batteryCapacityKwh: null, tankCapacityLiters: 40,
  },
  {
    brand: 'Honda', model: 'HR-V 1.5 e:HEV', year: 2023,
    fuelType: FuelType.SP95, consumption: 5.5,
    batteryCapacityKwh: null, tankCapacityLiters: 46,
  },
  {
    brand: 'Honda', model: 'Civic 2.0 e:HEV', year: 2023,
    fuelType: FuelType.SP95, consumption: 5.2,
    batteryCapacityKwh: null, tankCapacityLiters: 46,
  },

  // ── Mazda ─────────────────────────────────────────────────────────────────
  {
    brand: 'Mazda', model: 'Mazda2 1.5 Skyactiv-G 90', year: 2023,
    fuelType: FuelType.SP95, consumption: 5.5,
    batteryCapacityKwh: null, tankCapacityLiters: 44,
  },
  {
    brand: 'Mazda', model: 'Mazda3 2.0 Skyactiv-G 122', year: 2023,
    fuelType: FuelType.SP95, consumption: 6.1,
    batteryCapacityKwh: null, tankCapacityLiters: 51,
  },
  {
    brand: 'Mazda', model: 'CX-30 2.0 Skyactiv-X 186', year: 2023,
    fuelType: FuelType.SP95, consumption: 6.7,
    batteryCapacityKwh: null, tankCapacityLiters: 51,
  },
  {
    brand: 'Mazda', model: 'CX-5 2.2 Skyactiv-D 150', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 5.3,
    batteryCapacityKwh: null, tankCapacityLiters: 56,
  },

  // ── Volvo ─────────────────────────────────────────────────────────────────
  {
    brand: 'Volvo', model: 'XC40 B4 FWD Mild Hybrid', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.8,
    batteryCapacityKwh: null, tankCapacityLiters: 54,
  },
  {
    brand: 'Volvo', model: 'C40 Recharge Single Motor', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 19.5,
    batteryCapacityKwh: 82, tankCapacityLiters: null,
  },
  {
    brand: 'Volvo', model: 'EX30 Single Motor', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 15.7,
    batteryCapacityKwh: 69, tankCapacityLiters: null,
  },

  // ── Mini ──────────────────────────────────────────────────────────────────
  {
    brand: 'Mini', model: 'Cooper 1.5 136', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.8,
    batteryCapacityKwh: null, tankCapacityLiters: 40,
  },
  {
    brand: 'Mini', model: 'Cooper SE', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 15.5,
    batteryCapacityKwh: 54, tankCapacityLiters: null,
  },
  {
    brand: 'Mini', model: 'Countryman U25 E', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 18.0,
    batteryCapacityKwh: 64, tankCapacityLiters: null,
  },

  // ── BYD ───────────────────────────────────────────────────────────────────
  {
    brand: 'BYD', model: 'Atto 3', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 17.5,
    batteryCapacityKwh: 60, tankCapacityLiters: null,
  },
  {
    brand: 'BYD', model: 'Dolphin', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 14.6,
    batteryCapacityKwh: 60, tankCapacityLiters: null,
  },
  {
    brand: 'BYD', model: 'Seal', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 16.5,
    batteryCapacityKwh: 83, tankCapacityLiters: null,
  },
  {
    brand: 'BYD', model: 'Seal U', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 18.0,
    batteryCapacityKwh: 87, tankCapacityLiters: null,
  },

  // ── Alpine ────────────────────────────────────────────────────────────────
  {
    brand: 'Alpine', model: 'A290', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 14.3,
    batteryCapacityKwh: 52, tankCapacityLiters: null,
  },

  // ── Toyota (suite) ────────────────────────────────────────────────────────
  {
    brand: 'Toyota', model: 'C-HR 1.8 Hybrid', year: 2024,
    fuelType: FuelType.SP95, consumption: 5.2,
    batteryCapacityKwh: null, tankCapacityLiters: 43,
  },
  {
    brand: 'Toyota', model: 'RAV4 2.5 Hybrid', year: 2023,
    fuelType: FuelType.SP95, consumption: 6.0,
    batteryCapacityKwh: null, tankCapacityLiters: 55,
  },
  {
    brand: 'Toyota', model: 'Proace City Electric', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 21.0,
    batteryCapacityKwh: 50, tankCapacityLiters: null,
  },

  // ── Hyundai (suite) ───────────────────────────────────────────────────────
  {
    brand: 'Hyundai', model: 'IONIQ 5 RWD 73 kWh', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 18.3,
    batteryCapacityKwh: 73, tankCapacityLiters: null,
  },
  {
    brand: 'Hyundai', model: 'IONIQ 6 RWD 77 kWh', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 14.3,
    batteryCapacityKwh: 77, tankCapacityLiters: null,
  },
  {
    brand: 'Hyundai', model: 'i20 1.0 T-GDi 100', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.5,
    batteryCapacityKwh: null, tankCapacityLiters: 40,
  },

  // ── Kia (suite) ───────────────────────────────────────────────────────────
  {
    brand: 'Kia', model: 'EV6 AWD 77 kWh', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 18.5,
    batteryCapacityKwh: 77, tankCapacityLiters: null,
  },
  {
    brand: 'Kia', model: 'EV9 99 kWh', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 22.0,
    batteryCapacityKwh: 99, tankCapacityLiters: null,
  },
  {
    brand: 'Kia', model: 'Picanto 1.0 67', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 5.1,
    batteryCapacityKwh: null, tankCapacityLiters: 35,
  },

  // ── BMW (suite) ───────────────────────────────────────────────────────────
  {
    brand: 'BMW', model: 'i4 eDrive40', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 16.5,
    batteryCapacityKwh: 84, tankCapacityLiters: null,
  },
  {
    brand: 'BMW', model: '320d xDrive', year: 2023,
    fuelType: FuelType.DIESEL, consumption: 5.1,
    batteryCapacityKwh: null, tankCapacityLiters: 59,
  },

  // ── Tesla (suite) ─────────────────────────────────────────────────────────
  {
    brand: 'Tesla', model: 'Model 3 Highland RWD', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 14.2,
    batteryCapacityKwh: 60, tankCapacityLiters: null,
  },
  {
    brand: 'Tesla', model: 'Model S Plaid', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 21.0,
    batteryCapacityKwh: 100, tankCapacityLiters: null,
  },

  // ── Fiat (suite) ──────────────────────────────────────────────────────────
  {
    brand: 'Fiat', model: 'Tipo 1.5 Hybrid', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.0,
    batteryCapacityKwh: null, tankCapacityLiters: 48,
  },
  {
    brand: 'Fiat', model: '600e', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 15.0,
    batteryCapacityKwh: 54, tankCapacityLiters: null,
  },

  // ── MG ────────────────────────────────────────────────────────────────────
  {
    brand: 'MG', model: 'MG4 Standard Range', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 14.9,
    batteryCapacityKwh: 51, tankCapacityLiters: null,
  },
  {
    brand: 'MG', model: 'MG4 Long Range', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 16.1,
    batteryCapacityKwh: 77, tankCapacityLiters: null,
  },
  {
    brand: 'MG', model: 'ZS EV Long Range', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 16.0,
    batteryCapacityKwh: 72, tankCapacityLiters: null,
  },

  // ── Leapmotor ─────────────────────────────────────────────────────────────
  {
    brand: 'Leapmotor', model: 'T03', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 12.8,
    batteryCapacityKwh: 37, tankCapacityLiters: null,
  },
  {
    brand: 'Leapmotor', model: 'C10', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 17.0,
    batteryCapacityKwh: 69, tankCapacityLiters: null,
  },

  // ── Jeep ──────────────────────────────────────────────────────────────────
  {
    brand: 'Jeep', model: 'Avenger 1.2 T3 100', year: 2023,
    fuelType: FuelType.SP95_E10, consumption: 6.4,
    batteryCapacityKwh: null, tankCapacityLiters: 50,
  },
  {
    brand: 'Jeep', model: 'Avenger e', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 16.6,
    batteryCapacityKwh: 54, tankCapacityLiters: null,
  },

  // ── Smart ─────────────────────────────────────────────────────────────────
  {
    brand: 'Smart', model: '#1 Pro+', year: 2023,
    fuelType: FuelType.ELECTRIC, consumption: 17.0,
    batteryCapacityKwh: 62, tankCapacityLiters: null,
  },
  {
    brand: 'Smart', model: '#3 Pro+', year: 2024,
    fuelType: FuelType.ELECTRIC, consumption: 17.8,
    batteryCapacityKwh: 66, tankCapacityLiters: null,
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
