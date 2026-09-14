import { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Tabs,
  Tab,
  Badge,
  Tooltip,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TerminalIcon from '@mui/icons-material/Terminal';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { formatNotificationTitle, formatTime, formatSpeed } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference } from '../common/util/preferences';
import { eventsActions, devicesActions } from '../store';

const getEventCategory = (event) => {
  if (event.type === 'geofenceEnter' || event.type === 'geofenceExit' || event.geofenceId) {
    return 'geofences';
  }
  if (event.type === 'deviceOverspeed') {
    return 'speed';
  }
  if (event.type === 'alarm' || event.attributes?.alarm) {
    return 'alarms';
  }
  if (
    event.type === 'commandResult' ||
    event.type === 'queuedCommand' ||
    (event.type && event.type.toLowerCase().includes('command'))
  ) {
    return 'commands';
  }
  return 'other';
};

const getCategoryDetails = (category) => {
  switch (category) {
    case 'geofences':
      return {
        label: 'Geofences',
        icon: LocationOnIcon,
        color: '#1976d2',
        bgColor: 'rgba(25, 118, 210, 0.12)',
        badgeColor: '#1976d2',
      };
    case 'speed':
      return {
        label: 'Speed Limit',
        icon: SpeedIcon,
        color: '#d32f2f',
        bgColor: 'rgba(211, 47, 47, 0.12)',
        badgeColor: '#d32f2f',
      };
    case 'alarms':
      return {
        label: 'Alarms',
        icon: WarningAmberIcon,
        color: '#ed6c02',
        bgColor: 'rgba(237, 108, 2, 0.12)',
        badgeColor: '#ed6c02',
      };
    case 'commands':
      return {
        label: 'Commands',
        icon: TerminalIcon,
        color: '#2e7d32',
        bgColor: 'rgba(46, 125, 50, 0.12)',
        badgeColor: '#2e7d32',
      };
    case 'other':
    default:
      return {
        label: 'Other',
        icon: MoreHorizIcon,
        color: '#757575',
        bgColor: 'rgba(117, 117, 117, 0.12)',
        badgeColor: '#757575',
      };
  }
};

const useStyles = makeStyles()((theme) => ({
  drawerPaper: {
    width: '380px !important',
    minWidth: '380px !important',
    maxWidth: '100vw !important',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowX: 'hidden',
  },
  toolbar: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  title: {
    flexGrow: 1,
    fontWeight: 600,
  },
  list: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: 0,
  },
}));

const EventsDrawer = ({ open, onClose, filter, setFilter, filterDeviceId }) => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items);
  const events = useSelector((state) => state.events.items);

  const [currentTab, setCurrentTab] = useState('all');

  useEffect(() => {
    if (open) {
      setCurrentTab('all');
    }
  }, [open]);

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

    sortedEvents.forEach((event) => {
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

          // Group if same date and time difference is less than 2 hours
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

  const counts = useMemo(() => {
    const c = {
      all: displayEvents.length,
      geofences: 0,
      speed: 0,
      alarms: 0,
      commands: 0,
      other: 0,
    };
    displayEvents.forEach((event) => {
      const cat = getEventCategory(event);
      if (c[cat] !== undefined) {
        c[cat] += 1;
      } else {
        c.other += 1;
      }
    });
    return c;
  }, [displayEvents]);

  const filteredEvents = useMemo(() => {
    if (currentTab === 'all') return displayEvents;
    return displayEvents.filter((event) => getEventCategory(event) === currentTab);
  }, [displayEvents, currentTab]);

  const tabsConfig = useMemo(() => {
    const list = [
      { id: 'all', label: 'All', icon: FormatListBulletedIcon, color: '#1976d2' },
      { id: 'geofences', label: 'Geofences', icon: LocationOnIcon, color: '#1976d2' },
      { id: 'speed', label: 'Speed Limit', icon: SpeedIcon, color: '#d32f2f' },
      { id: 'alarms', label: 'Alarms', icon: WarningAmberIcon, color: '#ed6c02' },
      { id: 'commands', label: 'Commands', icon: TerminalIcon, color: '#2e7d32' },
    ];
    if (counts.other > 0) {
      list.push({ id: 'other', label: 'Other', icon: MoreHorizIcon, color: '#757575' });
    }
    return list;
  }, [counts.other]);

  const formatType = (event) => {
    let title = formatNotificationTitle(t, {
      type: event.type,
      attributes: {
        alarms: event.attributes?.alarm,
      },
    });
    if (event.geofenceId && geofences[event.geofenceId]) {
      title += `: ${geofences[event.geofenceId].name}`;
    }
    return title;
  };

  const handleDeleteFiltered = () => {
    if (currentTab === 'all') {
      dispatch(eventsActions.deleteAll());
    } else {
      try {
        const lastDismissedCategories = JSON.parse(localStorage.getItem('lastDismissedCategories') || '{}');
        lastDismissedCategories[currentTab] = new Date().toISOString();
        localStorage.setItem('lastDismissedCategories', JSON.stringify(lastDismissedCategories));
      } catch (e) {
        // ignore
      }
      const ids = [];
      filteredEvents.forEach((ev) => {
        if (ev.speedEvents && ev.speedEvents.length > 0) {
          ev.speedEvents.forEach((se) => ids.push(se.id));
        } else if (ev.id) {
          ids.push(ev.id);
        }
      });
      if (ids.length > 0) {
        dispatch(eventsActions.deleteMultiple(ids));
      }
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          className: classes.drawerPaper,
          sx: {
            width: '380px !important',
            minWidth: '380px !important',
            maxWidth: '100vw !important',
            overflowX: 'hidden',
            boxSizing: 'border-box',
          },
        },
      }}
      PaperProps={{
        className: classes.drawerPaper,
        sx: {
          width: '380px !important',
          minWidth: '380px !important',
          maxWidth: '100vw !important',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        },
      }}
      sx={{
        '& .MuiDrawer-paper': {
          width: '380px !important',
          minWidth: '380px !important',
          maxWidth: '100vw !important',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        },
      }}
    >
      <Box
        sx={{
          width: '380px',
          minWidth: '380px',
          maxWidth: '100vw',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
      <Toolbar className={classes.toolbar} disableGutters>
        <Typography variant="h6" className={classes.title}>
          {t('reportEvents') || 'Events'}
        </Typography>
        <Tooltip
          title={
            currentTab === 'all'
              ? 'Clear all events'
              : `Clear ${tabsConfig.find((t) => t.id === currentTab)?.label || ''} events`
          }
        >
          <span>
            <IconButton
              size="small"
              color="inherit"
              onClick={handleDeleteFiltered}
              disabled={filteredEvents.length === 0}
              sx={{ mr: 0.5 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Close">
          <IconButton
            size="small"
            color="inherit"
            onClick={onClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>

      {/* Modern Segmented Category Control */}
      <Box sx={{ px: 1.5, pt: 1.25, pb: 0.75, bgcolor: 'background.paper' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: '3px',
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f3f5'),
            borderRadius: '12px',
            gap: '3px',
          }}
        >
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const count = counts[tab.id] || 0;
            const isSelected = currentTab === tab.id;

            return (
              <Tooltip key={tab.id} title={tab.label} arrow enterTouchDelay={150}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setCurrentTab(tab.id)}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    py: 0.75,
                    px: 0.25,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                    borderRadius: '9px',
                    bgcolor: isSelected
                      ? (theme) => (theme.palette.mode === 'dark' ? '#2c2c2e' : '#ffffff')
                      : 'transparent',
                    boxShadow: isSelected
                      ? (theme) => (theme.palette.mode === 'dark' ? '0 2px 6px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.08)')
                      : 'none',
                    color: isSelected ? tab.color : 'text.secondary',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: isSelected
                        ? (theme) => (theme.palette.mode === 'dark' ? '#2c2c2e' : '#ffffff')
                        : (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)'),
                    },
                  }}
                >
                  <Icon
                    sx={{
                      fontSize: 20,
                      color: isSelected ? tab.color : 'text.secondary',
                      transition: 'color 0.15s ease',
                    }}
                  />
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: isSelected ? 800 : 600,
                      lineHeight: 1,
                      color: isSelected
                        ? tab.color
                        : count > 0
                        ? 'text.primary'
                        : 'text.disabled',
                    }}
                  >
                    {count}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>

      {/* Clean Category Subtitle Row */}
      <Box
        sx={{
          px: 2,
          py: 0.6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            color: 'text.secondary',
            fontSize: '0.72rem',
          }}
        >
          {tabsConfig.find((t) => t.id === currentTab)?.label || 'All'}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.72rem' }}>
          {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
        </Typography>
      </Box>

      {/* Events List or Empty State */}
      {filteredEvents.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            width: '100%',
            p: 4,
            color: 'text.secondary',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <NotificationsNoneIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
          <Typography variant="body1" fontWeight={500}>
            No events found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            {currentTab === 'all'
              ? 'There are no notifications at the moment'
              : `No events in ${tabsConfig.find((t) => t.id === currentTab)?.label || 'this category'}`}
          </Typography>
        </Box>
      ) : (
        <List className={classes.list} dense>
          {filteredEvents.map((event) => {
            const category = getEventCategory(event);
            const catDetails = getCategoryDetails(category);
            const CatIcon = catDetails.icon;

            return (
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
                sx={{
                  py: 1,
                  px: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  alignItems: 'flex-start',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38, mt: 0.5 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: catDetails.bgColor,
                      color: catDetails.color,
                    }}
                  >
                    <CatIcon sx={{ fontSize: 16 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {`${devices[event.deviceId]?.name || 'Device'} • ${formatType(event)}`}
                      {event.speedCount > 1 && (
                        <span style={{ marginLeft: '8px', backgroundColor: '#f44336', color: 'white', borderRadius: '10px', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {event.speedCount}
                        </span>
                      )}
                    </span>
                  }
                  secondary={formatTime(event.eventTime, 'seconds')}
                  primaryTypographyProps={{ style: { wordBreak: 'break-word', display: 'flex', alignItems: 'center', fontSize: '0.875rem' } }}
                  secondaryTypographyProps={{ style: { fontSize: '0.75rem', marginTop: '2px' } }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Tooltip title="View details">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      sx={{ mr: 0.5 }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (event.speedEvents && event.speedEvents.length > 0) {
                          dispatch(eventsActions.deleteMultiple(event.speedEvents.map((se) => se.id)));
                        } else {
                          dispatch(eventsActions.delete(event));
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItemButton>
            );
          })}
        </List>
      )}
      </Box>
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
                        {t('sharedGeofence') || 'Geofence'}: {name}
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
            {t('sharedClose') || 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default EventsDrawer;
