import { modeLabels, modes, themeLabels, themes } from '@ezhana/design-tokens'
import { SYSTEM_MODE } from '@ezhana/theme'

import { useTheme } from '../theme/useTheme'

import './ThemeSwitcher.css'

const THEME_SELECT_ID = 'theme-switcher-theme'

/** Label for the third mode option: follow the operating-system preference. */
const SYSTEM_LABEL = 'System'

/**
 * Compact toolbar for choosing the theme and the color mode.
 *
 * The theme control is a native `<select>` with a visually hidden label; the
 * mode control is a `role="group"` of toggle buttons using `aria-pressed`.
 * Both are driven by the generated theme metadata, so a new theme or mode shows
 * up here automatically.
 */
function ThemeSwitcher() {
  const { theme, mode, setTheme, setMode } = useTheme()

  return (
    <div className="theme-switcher">
      <div className="theme-switcher__theme">
        <label className="theme-switcher__label" htmlFor={THEME_SELECT_ID}>
          Theme
        </label>
        <span className="theme-switcher__select-wrap">
          <select
            id={THEME_SELECT_ID}
            className="theme-switcher__select"
            value={theme}
            onChange={(event) => {
              const nextTheme = themes.find((candidate) => candidate === event.target.value)

              if (nextTheme) setTheme(nextTheme)
            }}
          >
            {themes.map((themeOption) => (
              <option key={themeOption} value={themeOption}>
                {themeLabels[themeOption]}
              </option>
            ))}
          </select>
        </span>
      </div>

      <div className="theme-switcher__modes" role="group" aria-label="Color mode">
        {modes.map((modeOption) => (
          <button
            key={modeOption}
            type="button"
            className="theme-switcher__mode"
            aria-pressed={mode === modeOption}
            onClick={() => setMode(modeOption)}
          >
            {modeLabels[modeOption]}
          </button>
        ))}
        <button
          type="button"
          className="theme-switcher__mode"
          aria-pressed={mode === SYSTEM_MODE}
          onClick={() => setMode(SYSTEM_MODE)}
        >
          {SYSTEM_LABEL}
        </button>
      </div>
    </div>
  )
}

export default ThemeSwitcher
