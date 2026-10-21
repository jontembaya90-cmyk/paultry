import { View } from 'react-native';

import { Segmented } from '@/components/controls';
import { Icon } from '@/components/icon';
import { updateSettings } from '@/data/store';
import { APP_LANGUAGES, useLang } from '@/lib/i18n';
import { space, useTheme } from '@/theme';

/** English / Kiswahili. Saved on this phone only, so each person on the farm can pick their own. */
export function LanguageSwitch({ icon = true }: { icon?: boolean }) {
  const c = useTheme();
  const lang = useLang();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      {icon && <Icon name="language" size={24} color={c.inkSecondary} />}
      <View style={{ flex: 1 }}>
        <Segmented
          options={APP_LANGUAGES.map((l) => ({ value: l.key, label: l.label }))}
          value={lang === 'sw' ? 'sw' : 'en'}
          onChange={(language) => updateSettings({ language })}
        />
      </View>
    </View>
  );
}
