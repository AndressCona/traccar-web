import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { createRoot } from 'react-dom/client';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { map } from '../core/MapView';
import { addOrderedControl } from '../core/mapUtil';
import { savePersistedState } from '../../common/util/usePersistedState';

const useStyles = makeStyles()(() => ({
  button: {
    '&&': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#333',
    },
  },
}));

const MapThemeToggle = () => {
  const theme = useTheme();
  const { classes } = useStyles();
  const isDark = theme.palette.mode === 'dark';

  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  const rootRef = useRef(null);

  useEffect(() => {
    let container;
    let root;
    const control = {
      onAdd: () => {
        container = document.createElement('div');
        container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `maplibregl-ctrl-icon ${classes.button}`;
        button.onclick = () => savePersistedState('darkModeOverride', !isDarkRef.current);
        container.appendChild(button);
        root = createRoot(button);
        rootRef.current = root;
        root.render(
          isDarkRef.current ? (
            <DarkModeIcon fontSize="small" />
          ) : (
            <LightModeIcon fontSize="small" />
          ),
        );
        return container;
      },
      onRemove: () => {
        queueMicrotask(() => root.unmount());
        container.remove();
        rootRef.current = null;
      },
    };
    addOrderedControl(control, theme.direction === 'rtl' ? 'top-left' : 'top-right', 5);
    return () => map.removeControl(control);
  }, [theme.direction, classes.button]);

  useEffect(() => {
    rootRef.current?.render(
      isDark ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />,
    );
  }, [isDark]);

  return null;
};

export default MapThemeToggle;
