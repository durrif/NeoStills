// frontend/src/lib/types.ts

export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'brewer'
  is_active: boolean
  preferred_language: 'es' | 'en'
  distillery_id?: string
  brewery_id?: string
  created_at: string
}

export interface Brewery {
  id: string
  name: string
  description?: string
  location?: string
  logo_url?: string
  still_type?: StillType | null
  still_capacity_liters?: number | null
  usage_type?: UsageType
  space_dimensions?: SpaceDimensions | null
  owner_id: string
  created_at: string
  updated_at?: string
}

export type Distillery = Brewery

export type StillType = 'pot_still' | 'column_still' | 'reflux_still' | 'alembic' | 'other'
export type UsageType = 'home' | 'professional'

export interface SpaceDimensions {
  width_m: number
  depth_m: number
  height_m: number
}

export interface OnboardingStatus {
  is_complete: boolean
  missing_fields: string[]
  distillery_id: number
  distillery_name: string
  usage_type: UsageType
  still_type?: StillType | null
  still_capacity_liters?: number | null
  location?: string | null
  space_dimensions?: SpaceDimensions | null
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  user?: User
  brewery?: Brewery
  distillery?: Distillery
}

// Inventory
export type IngredientCategory =
  | 'cereal_base'
  | 'cereal_especial'
  | 'fruta'
  | 'botanico'
  | 'levadura'
  | 'azucar'
  | 'agua_quimica'
  | 'adjunto'
  | 'otro'

export type IngredientUnit = 'kg' | 'g' | 'l' | 'ml' | 'pkt' | 'unit'

export interface Ingredient {
  id: string
  distillery_id: string
  brewery_id?: string
  name: string
  category: IngredientCategory
  quantity: number
  unit: IngredientUnit
  min_stock?: number
  purchase_price?: number
  supplier?: string
  origin?: string
  flavor_profile?: string
  expiry_date?: string
  lot_number?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface IngredientCreate {
  name: string
  category: IngredientCategory
  quantity: number
  unit: IngredientUnit
  min_stock?: number
  purchase_price?: number
  supplier?: string
  origin?: string
  flavor_profile?: string
  expiry_date?: string
  lot_number?: string
  notes?: string
}

export interface IngredientUpdate extends Partial<IngredientCreate> {}

// Recipes
export interface RecipeIngredient {
  name: string
  amount_kg?: number
  amount_g?: number
  alpha_pct?: number
  time_min?: number
  use?: string
  type?: string
  origin?: string
  color_ebc?: number
  form?: string
  lab?: string
  product_id?: string
  attenuation_pct?: number
  min_temp?: number
  max_temp?: number
}

export interface MashStep {
  temp_c: number
  duration_min?: number
  time_min?: number
  name?: string
  type?: string
}

export interface Recipe {
  id: string
  distillery_id?: string
  brewery_id?: string
  name: string
  spirit_type?: string
  style?: string
  style_code?: string
  description?: string
  status: string
  distillation_method?: 'pot_still' | 'column_still' | 'reflux_still' | 'alembic'
  stripping_run_enabled?: boolean
  wash_volume_liters?: number
  batch_size_liters?: number
  fermentation_tank_capacity_liters?: number
  fruit_brix?: number
  efficiency_pct?: number
  og?: number
  fg?: number
  abv?: number
  wash_abv?: number
  target_abv?: number
  spirit_yield_liters?: number
  ibu?: number
  srm?: number
  ebc?: number
  cut_points?: Array<Record<string, unknown>>
  cereals?: RecipeIngredient[]
  botanicals?: RecipeIngredient[]
  fermentation_yeasts?: RecipeIngredient[]
  fermentables?: RecipeIngredient[]
  hops?: RecipeIngredient[]
  yeasts?: RecipeIngredient[]
  adjuncts?: RecipeIngredient[]
  mash_steps?: MashStep[]
  water_profile?: Record<string, unknown>
  notes?: string
  brewers_friend_id?: string
}

// Distillation Runs
export type BrewPhase =
  | 'planned'
  | 'mashing'
  | 'fermenting'
  | 'stripping_run'
  | 'spirit_run'
  | 'cuts_collection'
  | 'aging'
  | 'bottling'
  | 'completed'
  | 'aborted'

export interface BrewStep {
  id: string
  name: string
  description?: string
  duration_min?: number
  temp_c?: number
  notes?: string
  completed: boolean
  completed_at?: string
}

export interface BrewSession {
  id: string
  distillery_id: string
  recipe_id?: string
  name: string
  batch_number?: number
  phase: BrewPhase
  still_type?: string
  wash_volume_liters?: number
  target_abv?: number
  wash_abv?: number
  actual_abv?: number
  wash_yield_pct?: number
  spirit_volume_liters?: number
  stripping_run_enabled?: boolean
  heads_liters?: number
  hearts_liters?: number
  tails_liters?: number
  cut_temperature_heads?: number
  cut_temperature_tails?: number
  planned_og?: number
  actual_og?: number
  planned_fg?: number
  actual_fg?: number
  wash_date?: string
  fermentation_start?: string
  distillation_date?: string
  bottling_date?: string
  step_log?: Record<string, unknown>[]
  notes?: string
  created_at: string
  updated_at: string
}

// Fermentation
export interface FermentationDataPoint {
  id: string
  session_id: string
  recorded_at: string
  gravity: number
  temperature: number
  angle?: number
  battery?: number
  rssi?: number
  source: string
}

// Alias used by hooks
export type FermentationPoint = FermentationDataPoint

export interface ISpindelReading {
  name: string
  gravity: number
  temperature: number
  angle: number
  battery: number
  rssi: number
  timestamp: string
}

// Prices
export interface PriceRecord {
  ingredient_name: string
  shop_name: string
  shop_url: string
  product_url: string
  product_name: string
  price: number
  unit: string
  price_per_kg: number | null
  in_stock: boolean
  cached: boolean
  scraped_at: string | null
}

// Alias used by hooks
export type PriceResult = PriceRecord

export interface PriceAlert {
  id: number
  distillery_id?: number
  brewery_id: number
  ingredient_name: string
  alert_type: 'price_drop' | 'back_in_stock' | 'price_increase'
  threshold_price: number | null
  is_active: boolean
  last_triggered_at: string | null
  created_at: string
}

export interface PriceComparison {
  ingredient_name: string
  cheapest_price: number | null
  cheapest_shop: string | null
  all_offers: PriceRecord[]
}

// Can-brew check result
export interface CanBrewResult {
  status: 'ready' | 'partial' | 'missing'
  missing: Array<{ name: string; required: number; unit: string }>
  low_stock: Array<{ name: string; required: number; available: number; unit: string }>
  available: string[]
}

// ─── Pool Buying ────────────────────────────────────────────────────────────

export interface PoolParticipant {
  id: string
  name: string
  avatar?: string
  rating: number
  joinedAt: string
}

export interface PoolItem {
  id: string
  name: string
  unit: string
  /** Unit price at supplier */
  unitPrice: number
  /** { participantId → quantity } */
  quantities: Record<string, number>
}

export type PoolStatus = 'open' | 'closed' | 'ordered' | 'delivered' | 'cancelled'

export interface PoolOrder {
  id: string
  title: string
  supplier: string
  organizer: PoolParticipant
  participants: PoolParticipant[]
  items: PoolItem[]
  status: PoolStatus
  /** Amount before shipping */
  subtotal: number
  /** Shipping cost (0 if above free-shipping threshold) */
  shipping: number
  /** Individual cost without pool vs pool total */
  individualCostEstimate: number
  /** Savings percentage */
  savingsPercent: number
  /** Zone / city */
  zone: string
  /** Pickup location */
  deliveryPoint: string
  /** Deadline to join / add items */
  closingDate: string
  /** Estimated delivery date */
  estimatedDelivery: string
  createdAt: string
}

// AI
export type MessageRole = 'user' | 'assistant' | 'system'

export interface AIMessage {
  id: string
  role: MessageRole
  content: string
  created_at: string
}

export interface AIConversation {
  id: string
  distillery_id?: string
  brewery_id: string
  title: string
  messages: AIMessage[]
  context_page?: string
  created_at: string
  updated_at: string
}

// Voice
export interface VoiceCommand {
  text: string
  language?: 'es' | 'en'
  context?: string
}

export interface VoiceCapability {
  command: string
  description: string
  example: string
}

// Water Profile
export interface WaterProfile {
  id: string
  distillery_id?: string
  brewery_id: string
  name: string
  calcium_ppm: number
  magnesium_ppm: number
  sodium_ppm: number
  chloride_ppm: number
  sulfate_ppm: number
  bicarbonate_ppm: number
  ph?: number
  source?: string
  created_at: string
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

// API Error
export interface ApiError {
  detail: string
  status?: number
}
