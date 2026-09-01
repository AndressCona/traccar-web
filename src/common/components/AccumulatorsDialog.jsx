import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { useTranslation } from './LocalizationProvider';
import { useCatch } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import { distanceFromMeters, distanceToMeters, distanceUnitString } from '../util/converter';
import fetchOrThrow from '../util/fetchOrThrow';
import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()((theme) => ({
  paper: {
    borderRadius: theme.spacing(3),
  },
  title: {
    fontWeight: 700,
    padding: theme.spacing(2.5, 3, 1),
  },
  content: {
    '&&': {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2.5),
      padding: theme.spacing(3),
    },
  },
  actions: {
    padding: theme.spacing(1.5, 3, 2.5),
    gap: theme.spacing(1),
  },
  button: {
    borderRadius: theme.spacing(1.5),
    textTransform: 'none',
    fontWeight: 600,
  },
}));

const AccumulatorsDialog = ({ open, onClose, deviceId }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  
  const distanceUnit = useAttributePreference('distanceUnit');
  const position = useSelector((state) => state.session.positions[deviceId]);

  const [item, setItem] = useState();

  useEffect(() => {
    if (position && !item && open) {
      setItem({
        deviceId: parseInt(deviceId, 10),
        hours: position.attributes.hours || 0,
        totalDistance: position.attributes.totalDistance || 0,
      });
    }
  }, [deviceId, position, item, open]);

  useEffect(() => {
    if (!open) setItem(undefined);
  }, [open]);

  const handleSave = useCatch(async () => {
    await fetchOrThrow(`/api/devices/${deviceId}/accumulators`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { className: classes.paper } }}
    >
      <DialogTitle className={classes.title}>{t('sharedDeviceAccumulators')}</DialogTitle>
      <DialogContent className={classes.content}>
        {item && (
          <>
            <TextField
              type="number"
              value={Math.round(distanceFromMeters(item.totalDistance, distanceUnit))}
              onChange={(event) =>
                setItem({
                  ...item,
                  totalDistance: distanceToMeters(Number(event.target.value), distanceUnit),
                })
              }
              label={`${t('deviceTotalDistance')} (${distanceUnitString(distanceUnit, t)})`}
            />
          </>
        )}
      </DialogContent>
      <DialogActions className={classes.actions}>
        <Button onClick={onClose} className={classes.button}>
          {t('sharedCancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disableElevation
          className={classes.button}
        >
          {t('sharedSave')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccumulatorsDialog;
