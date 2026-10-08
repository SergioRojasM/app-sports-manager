/**
 * grit-arena-v2.pen draws its icons with Lucide; the app renders Material
 * Symbols Outlined. This is the single translation table (US-0116) — swapping
 * to lucide-react later only means changing GritIcon + this map.
 */
export const GRIT_ICON_MAP = {
  house: 'home',
  calendar: 'calendar_today',
  'calendar-days': 'calendar_month',
  'calendar-check': 'event_available',
  'clock-3': 'schedule',
  'map-pin': 'location_on',
  users: 'group',
  'user-round': 'person',
  'user-round-cog': 'manage_accounts',
  'trending-up': 'trending_up',
  'circle-check': 'check_circle',
  'arrow-up-right': 'arrow_outward',
  'arrow-right': 'arrow_forward',
  zap: 'bolt',
  dumbbell: 'fitness_center',
  'layout-dashboard': 'dashboard',
  'chart-column': 'bar_chart',
  settings: 'settings',
  shield: 'shield',
  car: 'directions_car',
  shirt: 'checkroom',
  bell: 'notifications',
  'chevron-down': 'expand_more',
  waves: 'pool',
  'building-2': 'corporate_fare',
  trophy: 'emoji_events',
  'credit-card': 'credit_card',
  ticket: 'confirmation_number',
  'sliders-horizontal': 'tune',
  'chevron-up': 'expand_less',
  'chevron-right': 'chevron_right',
  x: 'close',
  menu: 'menu',
  'log-out': 'logout',
} as const;

export type GritDesignIconName = keyof typeof GRIT_ICON_MAP;
