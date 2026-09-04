import { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { formatNotificationTitle, formatTime, formatSpeed } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference } from '../common/util/preferences';
import { eventsActions, devicesActions } from '../store';

const useStyles = makeStyles()((theme) => ({
  drawer: {
    width: theme.dimensions.eventsDrawerWidth,
  },
  toolbar: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
}));

const EventsDrawer = ({ open, onClose, filter, setFilter, filterDeviceId }) => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items);

  const events = useSelector((state) => state.events.items);

  const displayEvents = useMemo(() => {
    const grouped = [];
    const currentSpeedGroup = {};

    let sortedEvents = [...events].sort((a, b) => {
      const timeA = a.eventTime ? new Date(a.eventTime).getTime() : 0;
      const timeB = b.eventTime ? new Date(b.eventTime).getTime() : 0;
      return timeB - timeA;
    });

    if (filterDeviceId) {
      sortedEvents = sortedEvents.filter((event) => event.deviceId === filterDeviceId);
    }

    sortedEvents.forEach(event => {
      if (event.type === 'deviceOverspeed') {
        const activeGroup = currentSpeedGroup[event.deviceId];
        const eventTime = event.eventTime ? new Date(event.eventTime).getTime() : 0;

        let shouldCreateNew = true;
        if (activeGroup) {
          const lastEventInGroup = activeGroup.speedEvents[activeGroup.speedEvents.length - 1];
          const lastTime = lastEventInGroup.eventTime ? new Date(lastEventInGroup.eventTime).getTime() : 0;
          const timeDiff = Math.abs(lastTime - eventTime);
          
          const eventDate = new Date(eventTime).toDateString();
          const lastDate = new Date(lastTime).toDateString();

          // Agrupar si es el mismo dia y la diferencia de tiempo es menor a 2 horas (7200000 ms)
          if (eventDate === lastDate && timeDiff < 7200000) {
            shouldCreateNew = false;
          }
        }

        if (!shouldCreateNew) {
          activeGroup.speedCount += 1;
          activeGroup.speedEvents.push(event);
        } else {
          const groupedEvent = { ...event, speedCount: 1, speedEvents: [event] };
          currentSpeedGroup[event.deviceId] = groupedEvent;
          grouped.push(groupedEvent);
        }
      } else {
        grouped.push(event);
      }
    });

    return grouped;
  }, [events, filterDeviceId]);

  const speedUnit = useAttributePreference('speedUnit');

  const geofences = useSelector((state) => state.geofences.items);

  const [selectedEvent, setSelectedEvent] = useState(null);

  const formatType = (event) => {
    let title = formatNotificationTitle(t, {
      type: event.type,
      attributes: {
        alarms: event.attributes.alarm,
      },
    });
    if (event.geofenceId && geofences[event.geofenceId]) {
      title += `: ${geofences[event.geofenceId].name}`;
    }
    return title;
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Toolbar className={classes.toolbar} disableGutters>
        <Typography variant="h6" className={classes.title}>
          {t('reportEvents')}
        </Typography>
        <IconButton
          size="small"
          color="inherit"
          onClick={() => dispatch(eventsActions.deleteAll())}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Toolbar>
      <List className={classes.drawer} dense>
        {displayEvents.map((event) => (
          <ListItemButton
            key={event.id}
            onClick={() => {
              if (event.deviceId) {
                dispatch(devicesActions.selectId(event.deviceId));
                if (setFilter && filter) {
                  setFilter({ ...filter, statuses: [], alarm: false, driving: false, stopped: false });
                }
                navigate('/');
                onClose();
              }
            }}
            disabled={!event.id}
          >
            <ListItemText
              primary={
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {`${devices[event.deviceId]?.name} • ${formatType(event)}`}
                  {event.speedCount > 1 && (
                    <span style={{ marginLeft: '8px', backgroundColor: '#f44336', color: 'white', borderRadius: '10px', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {event.speedCount}
                    </span>
                  )}
                </span>
              }
              secondary={formatTime(event.eventTime, 'seconds')}
              primaryTypographyProps={{ style: { wordBreak: 'break-word', display: 'flex', alignItems: 'center' } }}
            />
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(event);
              }}
              sx={{ mr: 1 }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                dispatch(eventsActions.delete(event));
              }}
            >
              <DeleteIcon fontSize="small" className={classes.delete} />
            </IconButton>
          </ListItemButton>
        ))}
      </List>
      <Dialog
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle>{t('eventTitle') || 'Event Details'}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            {devices[selectedEvent?.deviceId]?.name} • {selectedEvent && formatType(selectedEvent)}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {selectedEvent && formatTime(selectedEvent.eventTime, 'seconds')}
          </Typography>
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#333' : '#f5f5f5',
              borderRadius: '12px',
              wordBreak: 'break-all',
            }}
          >
            {selectedEvent && (() => {
              if (selectedEvent.geofenceId && geofences[selectedEvent.geofenceId]) {
                const name = geofences[selectedEvent.geofenceId].name;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '6px', color: '#2196f3', fontSize: '1.2rem', lineHeight: 1 }}>•</span>
                      <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
                        {t('sharedGeofence')}: {name}
                      </Typography>
                    </div>
                  </div>
                );
              }
              if (selectedEvent.type === 'deviceOverspeed') {
                const eventsList = selectedEvent.speedEvents || [selectedEvent];
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '8px' }}>
                    {eventsList.map((se, i) => {
                      const speed = formatSpeed(se.attributes?.speed, speedUnit, t);
                      const limit = formatSpeed(se.attributes?.speedLimit, speedUnit, t);
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '8px', borderBottom: i < eventsList.length - 1 ? '1px solid rgba(128,128,128,0.2)' : 'none' }}>
                          <Typography variant="caption" color="textSecondary" style={{ fontWeight: 'bold' }}>
                            {formatTime(se.eventTime, 'seconds')}
                          </Typography>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px', color: 'inherit' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ marginRight: '6px', color: '#2196f3', fontSize: '1.2rem', lineHeight: 1 }}>•</span>
                              <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
                                {t('positionSpeed') || 'Speed'}: <span style={{ color: '#f44336', fontWeight: 'bold' }}>{speed}</span>
                              </Typography>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ marginRight: '6px', color: '#2196f3', fontSize: '1.2rem', lineHeight: 1 }}>•</span>
                              <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
                                {t('attributeSpeedLimit') || 'Speed Limit'}: {limit}
                              </Typography>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              const text = selectedEvent.attributes?.result || selectedEvent.attributes?.message || JSON.stringify(selectedEvent.attributes);
              if (text.startsWith('{') && text.endsWith('}')) {
                try {
                  const obj = JSON.parse(text);
                  const pairs = Object.entries(obj);
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px', color: 'inherit' }}>
                      {pairs.map(([key, val], index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '6px', color: '#2196f3', fontSize: '1.2rem', lineHeight: 1 }}>•</span>
                          <Typography variant="body2" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {key}: {String(val)}
                          </Typography>
                        </div>
                      ))}
                    </div>
                  );
                } catch (e) {
                  // ignore
                }
              }
              let friendlyMessage = null;
              if (text.includes('S20')) {
                const lastCmd = localStorage.getItem(`lastCommand_${selectedEvent?.deviceId}`);
                if (lastCmd === 'engineStop') {
                  friendlyMessage = 'Engine Cut Successful';
                } else if (lastCmd === 'engineResume') {
                  friendlyMessage = 'Engine Resume Successful';
                } else {
                  friendlyMessage = 'Engine Cut / Resume Successful';
                }
              } else if (text.includes('S21')) friendlyMessage = 'Engine Resume Successful';
              else if (text.includes('SET OK')) friendlyMessage = 'Command executed successfully';

              if (text.includes(',')) {
                const parts = text.split(',');
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {friendlyMessage && (
                      <Typography variant="body1" style={{ color: '#4caf50', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>
                        {friendlyMessage}
                      </Typography>
                    )}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px 16px',
                        color: 'inherit',
                      }}
                    >
                      {parts.map((part, index) => {
                        if (!part.trim()) return null;
                        return (
                          <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '6px', color: '#2196f3', fontSize: '1.2rem', lineHeight: 1 }}>•</span>
                            <Typography variant="body2" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {part.trim()}
                            </Typography>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {friendlyMessage && (
                    <Typography variant="body1" style={{ color: '#4caf50', fontWeight: 'bold', textAlign: 'center' }}>
                      {friendlyMessage}
                    </Typography>
                  )}
                  <Typography variant="body2" style={{ fontFamily: 'monospace' }}>
                    {text}
                  </Typography>
                </div>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)} color="primary">
            {t('sharedClose') || 'Cerrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default EventsDrawer;
