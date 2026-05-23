/** Trajet favori enregistré par l'utilisateur */
export interface Favorite {
  id: string;
  userId: string;
  name: string;
  originLabel: string;
  originLat: number;
  originLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  /** Identifiant du UserVehicle associé — null si aucun véhicule lié */
  vehicleId: string | null;
  createdAt: string;
}

/** Corps de la requête de création d'un favori */
export interface CreateFavoriteRequest {
  name: string;
  originLabel: string;
  originLat: number;
  originLng: number;
  destinationLabel: string;
  destinationLat: number;
  destinationLng: number;
  vehicleId?: string;
}

/** Corps de la requête de mise à jour d'un favori (seul le nom est modifiable) */
export interface UpdateFavoriteRequest {
  name: string;
}
