/**
 * Radar.io Autocomplete API Types
 * @see https://radar.io/documentation/api#autocomplete
 *
 * Free tier: 100,000 requests/month
 * Requires NEXT_PUBLIC_RADAR_API_KEY in .env.local
 */

/**
 * Individual address suggestion from Radar autocomplete
 */
export interface RadarAddress {
  /** Full formatted address string */
  formattedAddress: string;
  /** Country name */
  country: string;
  /** ISO 3166-1 alpha-2 country code */
  countryCode: string;
  /** Country flag emoji */
  countryFlag: string;
  /** State/province name */
  state: string;
  /** State/province abbreviation (e.g., "MI", "CA") */
  stateCode: string;
  /** Postal/ZIP code */
  postalCode: string;
  /** City name */
  city: string;
  /** Borough (for cities like NYC) */
  borough?: string;
  /** County name */
  county?: string;
  /** Neighborhood name */
  neighborhood?: string;
  /** Street address number */
  number?: string;
  /** Street name */
  street?: string;
  /** Address type: "address", "place", "city", "state", "postalCode", "country" */
  addressLabel?: string;
  /** Place name (for POIs/landmarks) */
  placeLabel?: string;
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Geometry object with coordinates */
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  /** Confidence score (0-1) */
  confidence?: string;
  /** Distance from search point in meters (if location provided) */
  distance?: number;
  /** Layer type for filtering */
  layer?: string;
}

/**
 * Radar autocomplete API response
 */
export interface RadarAutocompleteResponse {
  /** Response metadata */
  meta: {
    /** HTTP status code */
    code: number;
  };
  /** Array of address suggestions */
  addresses: RadarAddress[];
}

/**
 * Props for AddressAutocomplete component
 */
export interface AddressAutocompleteProps {
  /** Callback when user selects an address */
  onSelect: (address: string, coordinates?: { lat: number; lng: number }) => void;
  /** Callback when input value changes (for controlled usage) */
  onChange?: (value: string) => void;
  /** Placeholder text for input */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Initial value for the input */
  defaultValue?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Accessible label for the input */
  ariaLabel?: string;
}
