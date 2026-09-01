import { useEffect, useRef } from 'react';
import { useTheme, Badge } from '@mui/material';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { createRoot } from 'react-dom/client';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { map } from '../core/MapView';
import { addOrderedControl } from '../core/mapUtil';

const useStyles = makeStyles()((theme) => ({
  button: {
    '&&': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#333',
      overflow: 'visible !important',
    },
    '&&.active': {
      color: theme.palette.error.main,
    },
  },
}));

const MapNotification = ({ enabled, onClick }) => {
  const theme = useTheme();
  const { classes } = useStyles();

  const eventsCount = useSelector((state) => {
    const events = state.events.items;
    let count = 0;
    const currentSpeedGroup = {};

    const sortedEvents = [...events].sort((a, b) => {
      const timeA = a.eventTime ? new Date(a.eventTime).getTime() : 0;
      const timeB = b.eventTime ? new Date(b.eventTime).getTime() : 0;
      return timeB - timeA;
    });

    sortedEvents.forEach(event => {
      if (event.type === 'deviceOverspeed') {
        const activeGroup = currentSpeedGroup[event.deviceId];
        const eventTime = event.eventTime ? new Date(event.eventTime).getTime() : 0;
        let shouldCreateNew = true;
        if (activeGroup) {
          const lastTime = activeGroup.lastTime;
          const timeDiff = Math.abs(lastTime - eventTime);
          const eventDate = new Date(eventTime).toDateString();
          const lastDate = new Date(lastTime).toDateString();
          if (eventDate === lastDate && timeDiff < 7200000) {
            shouldCreateNew = false;
          }
        }
        if (!shouldCreateNew) {
          activeGroup.lastTime = eventTime;
        } else {
          currentSpeedGroup[event.deviceId] = { lastTime: eventTime };
          count++;
        }
      } else {
        count++;
      }
    });
    return count;
  });

  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  const buttonRef = useRef(null);
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
        button.onclick = () => onClickRef.current();
        container.appendChild(button);
        root = createRoot(button);
        rootRef.current = root;
        buttonRef.current = button;
        return container;
      },
      onRemove: () => {
        queueMicrotask(() => {
          root.unmount();
          rootRef.current = null;
        });
        container.remove();
      },
    };
    addOrderedControl(control, theme.direction === 'rtl' ? 'top-left' : 'top-right', 1);
    return () => map.removeControl(control);
  }, [theme.direction, classes.button]);

  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.render(
        <Badge
          badgeContent={eventsCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              top: 2,
              right: 2,
              fontSize: '0.65rem',
              height: '16px',
              minWidth: '16px',
            }
          }}
        >
          <NotificationsIcon fontSize="small" />
        </Badge>
      );
    }
  }, [eventsCount, classes.button]);

  useEffect(() => {
    buttonRef.current?.classList.toggle('active', enabled);
  }, [enabled, classes.button]);

  return null;
};

export default MapNotification;
