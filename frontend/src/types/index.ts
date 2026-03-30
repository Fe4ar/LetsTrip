export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'teamleiter' | 'reisender'
  is_active?: boolean
}

export interface Trip {
  id: number
  name: string
  description: string
  start_date: string
  end_date: string
  created_by: number
  members: TripMember[]
  days?: TripDay[]
}

export interface TripMember {
  id: number
  user_id: number
  name: string
  email: string
  role: string
}

export interface TripDay {
  id: number
  day_number: number
  date: string
  label: string
  notes: string
  places?: Place[]
}

export interface Place {
  id: number
  trip_id: number
  day_id: number | null
  name: string
  address: string
  lat: number | null
  lon: number | null
  notes: string
  category: string
  order_index: number
}

export interface Expense {
  id: number
  trip_id: number
  day_id: number | null
  title: string
  amount: number
  currency: string
  date: string | null
  category: string
  notes: string
  paid_by: number | null
  payer_name: string | null
  participants: ExpenseParticipant[]
}

export interface ExpenseParticipant {
  user_id: number
  name: string
  share: number
}

export interface Booking {
  id: number
  trip_id: number
  title: string
  booking_type: string
  date: string | null
  price: number | null
  currency: string
  notes: string
  link: string
}

export interface FileAsset {
  id: number
  trip_id: number
  original_name: string
  stored_name: string
  mime_type: string
  size: number
  notes: string
  uploaded_by: number
  created_at: string
  url: string
}

export interface ActivityLog {
  id: number
  action: string
  description: string
  user_name: string
  created_at: string
}

export interface RouteSegment {
  from_place: Place
  to_place: Place
  distance_m: number
  duration_s: number
}

export interface RouteData {
  segments: RouteSegment[]
  total_distance: number
  total_duration: number
  geometry: any
}

export interface ExpenseSummary {
  total: number
  by_category: { category: string; amount: number }[]
  by_person: { user_id: number; name: string; total: number; entries: any[] }[]
}
