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
  vehicleId: string | null;
  createdAt: string;
}

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

export interface UpdateFavoriteRequest {
  name: string;
}
