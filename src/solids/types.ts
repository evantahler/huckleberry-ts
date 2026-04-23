export interface FirebaseCustomFoodTypeDocument {
  created_at: string;
  updated_at: string;
  name: string;
  archived: boolean;
  id: string;
  type: "solids";
  image: string;
  source: "custom";
}

export interface FirebaseCuratedFoodDocument {
  id: string;
  name: string;
  source: "curated";
  aka?: string[];
  is_common_allergen?: boolean;
  is_high_choking_hazard?: boolean;
  recommended_age_to_start?: number;
  category?: Record<string, boolean>;
  link_key?: string;
  rank?: number;
  image?: string;
}
