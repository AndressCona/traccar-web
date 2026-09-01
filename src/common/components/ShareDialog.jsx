import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { useTranslation } from './LocalizationProvider';
import { useCatchCallback } from '../../reactHelper';
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

const ShareDialog = ({ open, onClose, deviceId }) => {
  const { classes } = useStyles();
  const t = useTranslation();

  const item = useSelector((state) => state.devices.items[deviceId]);

  const [expiration, setExpiration] = useState(() =>
    dayjs().add(1, 'week').locale('en').format('YYYY-MM-DDTHH:mm')
  );
  const [link, setLink] = useState();

  useEffect(() => {
    if (!open) {
      setLink(undefined);
      setExpiration(dayjs().add(1, 'week').locale('en').format('YYYY-MM-DDTHH:mm'));
    }
  }, [open]);

  const handleShare = useCatchCallback(async () => {
    const expirationTime = dayjs(expiration).toISOString();
    const response = await fetchOrThrow(`/api/share/device`, {
      method: 'POST',
      body: new URLSearchParams(`deviceId=${deviceId}&expiration=${expirationTime}`),
    });
    const token = await response.text();
    setLink(`${window.location.origin}?token=${token}`);
  }, [deviceId, expiration, setLink]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { className: classes.paper } }}
    >
      <DialogTitle className={classes.title}>{t('sharedShare')}</DialogTitle>
      <DialogContent className={classes.content}>
        {item && (
          <>
            <TextField
              value={item.name}
              label={t('sharedDevice')}
              disabled
            />
            <TextField
              label={t('userExpirationTime')}
              type="datetime-local"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
            />
            <Button variant="outlined" color="primary" onClick={handleShare} className={classes.button}>
              {t('reportShow')}
            </Button>
            <TextField
              value={link || ''}
              onChange={(e) => setLink(e.target.value)}
              label={t('sharedLink')}
              slotProps={{ input: { readOnly: true } }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions className={classes.actions}>
        <Button onClick={onClose} className={classes.button}>
          {t('sharedCancel')}
        </Button>
        <Button
          onClick={() => navigator.clipboard?.writeText(link)}
          disabled={!link}
          variant="contained"
          disableElevation
          className={classes.button}
        >
          {t('sharedCopy')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog;
