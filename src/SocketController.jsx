import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Snackbar, Alert } from '@mui/material';
import { devicesActions, sessionActions } from './store';
import { useCatchCallback, useAsyncTask } from './reactHelper';
import { snackBarDurationLongMs } from './common/util/duration';
import alarm from './resources/alarm.mp3';
import { eventsActions } from './store/events';
import useFeatures from './common/util/useFeatures';
import { useAttributePreference } from './common/util/preferences';
import {
  handleNativeNotificationListeners,
  nativePostMessage,
} from './common/components/NativeInterface';
import fetchOrThrow from './common/util/fetchOrThrow';

const logoutCode = 4000;

let alarmAudio;
const playAlarm = () => {
  if (!alarmAudio) {
    alarmAudio = new Audio(alarm);
  }
  alarmAudio.currentTime = 0;
  alarmAudio.play();
};

const SocketController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const authenticated = useSelector((state) => Boolean(state.session.user));
  const includeLogs = useSelector((state) => state.session.includeLogs);

  const socketRef = useRef();
  const reconnectTimeoutRef = useRef();

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const [notifications, setNotifications] = useState([]);

  const soundEvents = useAttributePreference('soundEvents', '');
  const soundAlarms = useAttributePreference('soundAlarms', 'sos');

  const features = useFeatures();

  const handleEvents = useCallback(
    (events) => {
      const importantTypes = ['commandResult', 'alarm', 'deviceOverspeed', 'geofenceEnter', 'geofenceExit', 'maintenance'];
      const filteredEvents = events.filter((e) => importantTypes.includes(e.type));
      if (filteredEvents.length === 0) return;

      if (!features.disableEvents) {
        dispatch(eventsActions.add(filteredEvents));
      }
      if (
        filteredEvents.some(
          (e) =>
            soundEvents.includes(e.type) ||
            (e.type === 'alarm' && soundAlarms.includes(e.attributes.alarm)),
        )
      ) {
        playAlarm();
      }
      setNotifications(
        filteredEvents.map((event) => ({
          id: event.id,
          deviceId: event.deviceId,
          message: event.attributes.message,
          show: true,
        })),
      );
    },
    [features, dispatch, soundEvents, soundAlarms],
  );

  const handleEventsRef = useRef(handleEvents);
  handleEventsRef.current = handleEvents;

  const connectSocketRef = useRef();

  const connectSocket = useCallback(() => {
    clearReconnectTimeout();
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
      socketRef.current.close();
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/socket`);
    socketRef.current = socket;

    socket.onopen = () => {
      dispatch(sessionActions.updateSocket(true));
    };

    socket.onclose = async (event) => {
      dispatch(sessionActions.updateSocket(false));
      if (event.code === logoutCode) return;
      try {
        const devicesResponse = await fetch('/api/devices');
        if (socketRef.current !== socket) return;
        if (devicesResponse.ok) {
          dispatch(devicesActions.update(await devicesResponse.json()));
        }
        const positionsResponse = await fetch('/api/positions');
        if (socketRef.current !== socket) return;
        if (positionsResponse.ok) {
          dispatch(sessionActions.updatePositions(await positionsResponse.json()));
        }
        if (devicesResponse.status === 401 || positionsResponse.status === 401) {
          navigate('/login');
        }
      } catch {
        // ignore errors
      }
      if (socketRef.current !== socket) return;
      clearReconnectTimeout();
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connectSocketRef.current?.();
      }, 60000);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.devices) {
        dispatch(devicesActions.update(data.devices));
      }
      if (data.positions) {
        dispatch(sessionActions.updatePositions(data.positions));
      }
      if (data.events) {
        handleEventsRef.current(data.events);
      }
      if (data.logs) {
        dispatch(sessionActions.updateLogs(data.logs));
      }
    };
  }, [clearReconnectTimeout, dispatch, navigate]);

  connectSocketRef.current = connectSocket;

  useEffect(() => {
    socketRef.current?.send(JSON.stringify({ logs: includeLogs }));
  }, [includeLogs]);

  useAsyncTask(
    async ({ signal }) => {
      if (authenticated) {
        const response = await fetchOrThrow('/api/devices', { signal });
        dispatch(devicesActions.refresh(await response.json()));

        try {
          const to = new Date();
          const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
          const query = new URLSearchParams({
            from: from.toISOString(),
            to: to.toISOString(),
          });
          const eventsResponse = await fetch(`/api/reports/events?${query.toString()}`, {
            headers: { Accept: 'application/json' },
            signal,
          });
          if (eventsResponse.ok) {
            const events = await eventsResponse.json();
            const dismissed = JSON.parse(localStorage.getItem('dismissedEvents') || '[]');
            const importantTypes = ['commandResult', 'alarm', 'deviceOverspeed', 'geofenceEnter', 'geofenceExit', 'maintenance'];
            const filteredEvents = events.filter((e) => !dismissed.includes(e.id) && importantTypes.includes(e.type));
            dispatch(eventsActions.add(filteredEvents));
          }
        } catch (e) {
          // ignore
        }

        nativePostMessage('authenticated');
        connectSocket();
        return () => {
          clearReconnectTimeout();
          socketRef.current?.close(logoutCode);
        };
      }
      return null;
    },
    [authenticated, dispatch, clearReconnectTimeout, connectSocket],
  );

  const handleNativeNotification = useCatchCallback(
    async (message) => {
      const eventId = message.data.eventId;
      if (eventId) {
        const response = await fetch(`/api/events/${eventId}`);
        if (response.ok) {
          const event = await response.json();
          const eventWithMessage = {
            ...event,
            attributes: { ...event.attributes, message: message.notification.body },
          };
          handleEvents([eventWithMessage]);
        }
      }
    },
    [handleEvents],
  );

  useEffect(() => {
    handleNativeNotificationListeners.add(handleNativeNotification);
    return () => handleNativeNotificationListeners.delete(handleNativeNotification);
  }, [handleNativeNotification]);

  useEffect(() => {
    if (!authenticated) return;
    const reconnectIfNeeded = () => {
      const socket = socketRef.current;
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        connectSocket();
      } else if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send('{}');
        } catch {
          // test connection
        }
      }
    };
    const onVisibility = () => {
      if (!document.hidden) {
        reconnectIfNeeded();
      }
    };
    window.addEventListener('online', reconnectIfNeeded);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', reconnectIfNeeded);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authenticated, connectSocket]);

  return (
    <>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={notification.show}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={snackBarDurationLongMs}
          onClose={() => setNotifications((prev) => prev.filter((e) => e.id !== notification.id))}
          sx={{
            top: '8px !important',
            right: '60px !important',
          }}
        >
          <Alert
            severity="info"
            onClose={(e) => {
              e.stopPropagation();
              setNotifications((prev) => prev.filter((e) => e.id !== notification.id));
            }}
            sx={{
              width: '100%',
              minWidth: { xs: '280px', sm: '350px' },
              maxWidth: '450px',
              borderRadius: '16px',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(30, 30, 30, 0.85)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontWeight: 500,
              fontSize: '0.9rem',
              '& .MuiAlert-icon': {
                color: '#2196f3',
              },
              '& .MuiAlert-message': {
                wordBreak: 'break-word',
                padding: 0,
              },
              '& .MuiAlert-action': {
                color: 'rgba(255, 255, 255, 0.7)',
                '& .MuiIconButton-root': {
                  color: 'inherit',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                },
              },
            }}
          >
            <div
              onClick={() => {
                if (notification.deviceId) {
                  dispatch(devicesActions.selectId(notification.deviceId));
                  navigate('/');
                }
              }}
              style={{ cursor: 'pointer', padding: '6px 0' }}
            >
              {notification.message}
            </div>
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default SocketController;
