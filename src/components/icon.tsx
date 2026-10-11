import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

type SymbolName = Extract<SymbolViewProps['name'], { ios?: unknown }>;
type Sym = { ios: NonNullable<SymbolName['ios']>; android: NonNullable<SymbolName['android']> };

/** Platform icon names: SF Symbols on iOS, Material Symbols on Android and web. */
const SYMBOLS = {
  today: { ios: 'sun.horizon', android: 'wb_twilight' },
  health: { ios: 'cross.case', android: 'health_and_safety' },
  business: { ios: 'storefront', android: 'storefront' },
  farm: { ios: 'house.lodge', android: 'home_work' },
  add: { ios: 'plus', android: 'add' },
  remove: { ios: 'minus', android: 'remove' },
  close: { ios: 'xmark', android: 'close' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  circle: { ios: 'circle', android: 'radio_button_unchecked' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more' },
  chevronUp: { ios: 'chevron.up', android: 'expand_less' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  feed: { ios: 'leaf', android: 'grain' },
  water: { ios: 'drop', android: 'water_drop' },
  losses: { ios: 'heart', android: 'favorite' },
  weight: { ios: 'scalemass', android: 'scale' },
  medication: { ios: 'pills', android: 'medication' },
  vaccine: { ios: 'syringe', android: 'vaccines' },
  sale: { ios: 'banknote', android: 'payments' },
  note: { ios: 'mic', android: 'mic' },
  keypad: { ios: 'circle.grid.3x3', android: 'dialpad' },
  tray: { ios: 'square.grid.3x3', android: 'grid_on' },
  backspace: { ios: 'delete.left', android: 'backspace' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  info: { ios: 'info.circle', android: 'info' },
  error: { ios: 'exclamationmark.octagon.fill', android: 'error' },
  heat: { ios: 'thermometer.sun', android: 'heat' },
  thermometer: { ios: 'thermometer.medium', android: 'device_thermostat' },
  humidity: { ios: 'humidity', android: 'humidity_percentage' },
  sun: { ios: 'sun.max', android: 'sunny' },
  moon: { ios: 'moon.stars', android: 'moon_stars' },
  cloudDone: { ios: 'checkmark.icloud', android: 'cloud_done' },
  cloudOff: { ios: 'icloud.slash', android: 'cloud_off' },
  sync: { ios: 'arrow.triangle.2.circlepath', android: 'sync' },
  syncProblem: { ios: 'exclamationmark.icloud', android: 'sync_problem' },
  call: { ios: 'phone', android: 'call' },
  message: { ios: 'message', android: 'sms' },
  cart: { ios: 'cart', android: 'shopping_cart' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  camera: { ios: 'camera', android: 'add_a_photo' },
  photo: { ios: 'photo.on.rectangle', android: 'photo_library' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  timeline: { ios: 'list.bullet', android: 'view_agenda' },
  person: { ios: 'person', android: 'person' },
  people: { ios: 'person.2', android: 'group' },
  personAdd: { ios: 'person.badge.plus', android: 'person_add' },
  shield: { ios: 'checkmark.shield', android: 'verified_user' },
  quarantine: { ios: 'exclamationmark.shield', android: 'shield' },
  footprint: { ios: 'shoeprints.fill', android: 'footprint' },
  stethoscope: { ios: 'stethoscope', android: 'stethoscope' },
  receipt: { ios: 'doc.text', android: 'receipt_long' },
  chart: { ios: 'chart.xyaxis.line', android: 'show_chart' },
  trendingUp: { ios: 'arrow.up.right', android: 'trending_up' },
  trendingDown: { ios: 'arrow.down.right', android: 'trending_down' },
  language: { ios: 'globe', android: 'translate' },
  lock: { ios: 'lock', android: 'lock' },
  settings: { ios: 'gearshape', android: 'settings' },
  palette: { ios: 'paintpalette', android: 'palette' },
  sensors: { ios: 'sensor', android: 'sensors' },
  light: { ios: 'lightbulb', android: 'lightbulb' },
  air: { ios: 'wind', android: 'air' },
  edit: { ios: 'pencil', android: 'edit' },
  archive: { ios: 'archivebox', android: 'archive' },
  download: { ios: 'arrow.down.doc', android: 'download' },
  table: { ios: 'tablecells', android: 'table_view' },
  bank: { ios: 'building.columns', android: 'account_balance' },
  phone: { ios: 'iphone', android: 'smartphone' },
  cash: { ios: 'dollarsign', android: 'attach_money' },
  history: { ios: 'clock.arrow.circlepath', android: 'history' },
  undo: { ios: 'arrow.uturn.backward', android: 'undo' },
  celebrate: { ios: 'sparkles', android: 'celebration' },
  hourglass: { ios: 'hourglass', android: 'hourglass_top' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  scan: { ios: 'doc.viewfinder', android: 'document_scanner' },
  grass: { ios: 'leaf', android: 'grass' },
  dark: { ios: 'moon', android: 'dark_mode' },
  sliders: { ios: 'slider.horizontal.3', android: 'tune' },
} satisfies Record<string, Sym>;

const CUSTOM = ['egg', 'hen', 'chick', 'duck', 'turkey', 'quail', 'coop', 'feeder', 'drinker', 'incubator'] as const;

export type CustomIcon = (typeof CUSTOM)[number];
export type IconName = keyof typeof SYMBOLS | CustomIcon;

export function Icon({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const tint = color ?? c.ink;
  if ((CUSTOM as readonly string[]).includes(name)) {
    return (
      <View style={[{ width: size, height: size }, style]} accessible={false} importantForAccessibility="no">
        <CustomGlyph name={name as CustomIcon} size={size} color={tint as string} />
      </View>
    );
  }
  return (
    <SymbolView
      name={{ ...SYMBOLS[name as keyof typeof SYMBOLS], web: SYMBOLS[name as keyof typeof SYMBOLS].android }}
      size={size}
      tintColor={tint}
      style={style}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}

/**
 * The custom set, drawn on a 24-unit grid with a 1.9 stroke so it sits beside Material
 * Symbols (weight 400) and SF Symbols (regular) without looking borrowed.
 */
function CustomGlyph({ name, size, color }: { name: CustomIcon; size: number; color: string }) {
  const stroke = { stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'egg' && <Path {...stroke} d="M12 3C8.4 3 5.5 8.6 5.5 13.1 5.5 17.4 8.3 21 12 21s6.5-3.6 6.5-7.9C18.5 8.6 15.6 3 12 3z" />}
      {(name === 'hen' || name === 'duck' || name === 'turkey' || name === 'quail') && <Bird kind={name} stroke={stroke} color={color} />}
      {name === 'chick' && (
        <>
          <Circle {...stroke} cx={11} cy={14.6} r={5.6} />
          <Path {...stroke} d="M12.6 9.3a3.4 3.4 0 1 1 4.6 3" />
          <Path {...stroke} d="M18.6 9.6l2 .7-2 .9" />
          <Circle cx={15.6} cy={8.9} r={0.9} fill={color} />
          <Path {...stroke} d="M9.5 20.2v1.3M12.5 20.2v1.3M7.6 14.5c1.2 1.4 3.2 1.5 4.6.3" />
        </>
      )}
      {name === 'coop' && (
        <>
          <Path {...stroke} d="M2.8 10.6L12 3.8l9.2 6.8" />
          <Path {...stroke} d="M5.2 9v11.2h13.6V9" />
          <Path {...stroke} d="M10 20.2v-3.6a2 2 0 0 1 4 0v3.6" />
          <Circle {...stroke} cx={12} cy={10.6} r={1.6} />
        </>
      )}
      {name === 'feeder' && (
        <>
          <Path {...stroke} d="M12 2.5v2.3" />
          <Rect {...stroke} x={8.6} y={4.8} width={6.8} height={9.6} rx={1.4} />
          <Path {...stroke} d="M4.4 17.2c0-1.5 3.4-2.8 7.6-2.8s7.6 1.3 7.6 2.8-3.4 2.8-7.6 2.8-7.6-1.3-7.6-2.8z" />
        </>
      )}
      {name === 'drinker' && (
        <>
          <Path {...stroke} d="M12 2.5v2.3" />
          <Path {...stroke} d="M9 4.8h6l2.6 9.4H6.4z" />
          <Path {...stroke} d="M4 16.4c0 1.9 3.6 3.4 8 3.4s8-1.5 8-3.4" />
          <Path {...stroke} d="M4 16.4h16" />
        </>
      )}
      {name === 'incubator' && (
        <>
          <Rect {...stroke} x={3} y={5} width={18} height={14.5} rx={2.4} />
          <Path {...stroke} d="M7 8.4h10" />
          <Ellipse {...stroke} cx={9.2} cy={14.2} rx={2} ry={2.5} />
          <Ellipse {...stroke} cx={14.8} cy={14.2} rx={2} ry={2.5} />
        </>
      )}
    </Svg>
  );
}

function Bird({ kind, stroke, color }: { kind: 'hen' | 'duck' | 'turkey' | 'quail'; stroke: object; color: string }) {
  if (kind === 'quail') {
    return (
      <>
        <Path {...stroke} d="M4.5 13.2c0-3.6 3.2-6 7.3-6 1.1 0 1.9-1.9 3.7-1.9 1.6 0 2.8 1.2 2.8 2.8v1.3c0 4.7-3.3 8.4-7.8 8.4-3.6 0-6-1.9-6-4.6z" />
        <Path {...stroke} d="M18.3 8l1.9.6-1.9.8M15 5.3c.2-1.3 1-2.1 2.2-2.2" />
        <Circle cx={15.9} cy={7.7} r={0.85} fill={color} />
        <Path {...stroke} d="M9.4 17.7v2.6M12.4 17.7v2.6" />
      </>
    );
  }
  if (kind === 'duck') {
    return (
      <>
        <Path {...stroke} d="M3.6 11.5c.9 4.4 4 6.9 8.2 6.9 4.3 0 7.4-2.7 7.4-6.3 0-1.9-1-3.1-2.2-3.8V7.1a3 3 0 0 0-6 0v3.3c0 1-.6 1.7-1.6 1.7z" />
        <Path {...stroke} d="M16.9 7.4h3.6c.2.9-.6 1.6-1.6 1.6h-2" />
        <Circle cx={14.1} cy={6.6} r={0.85} fill={color} />
        <Path {...stroke} d="M8.4 13.9c1.6 1.3 3.9 1.4 5.6.2" />
      </>
    );
  }
  return (
    <>
      {kind === 'turkey' ? (
        <Path {...stroke} d="M8.6 9.6C5.8 9.3 3.5 7 3.4 4.2M8.2 11.4C5.2 12 2.6 10.8 1.8 8.6M10 8.5C8.9 6.1 9.3 3.6 10.9 2.2" />
      ) : (
        <Path {...stroke} d="M8.2 10.3L4.4 5.8c-1.2 2.9-1.3 6.2 0 8.8" />
      )}
      <Path {...stroke} d="M14.6 8.6C13.2 10.4 10.9 10.9 8.2 10.3 6.2 9.9 4.4 11.6 4.4 14.6c.8 2.8 3.9 4.9 7.6 4.9 3.9 0 6.9-2.9 6.9-6.6 0-1.4-.4-2.6-1.2-3.5" />
      <Circle {...stroke} cx={16.4} cy={7.2} r={2.6} />
      <Path {...stroke} d="M18.9 6.9l2 .9-2 .9" />
      {kind === 'hen' && <Path {...stroke} d="M14.6 4.9c.2-1 1-1.6 1.9-1.3.5-.8 1.7-.8 2.1.2" />}
      {kind === 'turkey' && <Path {...stroke} d="M18.4 9.6v2.2" />}
      <Circle cx={16.9} cy={6.9} r={0.85} fill={color} />
      <Path {...stroke} d="M8.4 14.6c1.6 1.4 4 1.5 5.6.3M10.6 19.4v2.1M13.6 19.4v2.1" />
    </>
  );
}
