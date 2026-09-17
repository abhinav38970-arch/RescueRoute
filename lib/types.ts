export type DonationStatus =
  | "Available"
  | "Claimed"
  | "Driver Assigned"
  | "Picked Up"
  | "Delivered";

export type StorageType = "room" | "refrigerated" | "frozen";

export interface Donation {
  id: string;
  title: string;
  description: string;
  // Total countable quantity. Unit is "meals" only when the donor explicitly
  // states a prepared-meal count; otherwise "items" (sandwiches, pastries…).
  meals: number;
  unit: "meals" | "items";
  pounds: number;
  category: string;
  dietaryTags: string[];
  allergens: string[];
  storage: StorageType;
  pickupDeadline: string;
  pickupLocation: string;
  pickupNotes?: string;
  donorName: string;
  status: DonationStatus;
  claimedByOrgId?: string;
  claimedByOrgName?: string;
  driverName?: string;
  distanceMiles: number;
  etaMinutes: number;
  createdAt: string;
  deliveredAt?: string;
}

export interface Nonprofit {
  id: string;
  name: string;
  acceptsPrepared: boolean;
  acceptsBaked: boolean;
  acceptsProduce: boolean;
  hasFridge: boolean;
  hasFreezer: boolean;
  dietarySupport: string[];
  openUntil: string;
  maxMeals: number;
  distanceMiles: number;
  notes: string;
}

export type Role = "donor" | "nonprofit" | "volunteer";

export const STATUS_FLOW: DonationStatus[] = [
  "Available",
  "Claimed",
  "Driver Assigned",
  "Picked Up",
  "Delivered",
];
