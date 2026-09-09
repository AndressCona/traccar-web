import { useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import FileInput from '../common/components/FileInput';
import EditItemView from './components/EditItemView';
import EditAttributesAccordion from './components/EditAttributesAccordion';
import SelectField from '../common/components/SelectField';
import deviceCategories from '../common/util/deviceCategories';
import { useTranslation } from '../common/components/LocalizationProvider';
import useDeviceAttributes from '../common/attributes/useDeviceAttributes';
import { useManager } from '../common/util/permissions';
import SettingsMenu from './components/SettingsMenu';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import { useCatch } from '../reactHelper';
import useSettingsStyles from './common/useSettingsStyles';
import QrCodeDialog from '../common/components/QrCodeDialog';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { devicesActions } from '../store';

const DevicePage = ({ isDialog, id: propId, onClose, item: propItem }) => {
  const { classes } = useSettingsStyles();
  const t = useTranslation();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const manager = useManager();

  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const deviceAttributes = useDeviceAttributes(t);

  const [searchParams] = useSearchParams();
  const uniqueId = searchParams.get('uniqueId');

  const groups = useSelector((state) => state.groups.items);
  const defaultGroupId = useMemo(() => {
    const othersGroup = Object.values(groups || {}).find((g) => g.name.toLowerCase() === 'others');
    return othersGroup ? othersGroup.id : undefined;
  }, [groups]);

  const defaultItem = useMemo(
    () => ({
      category: 'car',
      ...(defaultGroupId ? { groupId: defaultGroupId } : {}),
      ...(uniqueId ? { uniqueId } : {}),
    }),
    [uniqueId, defaultGroupId],
  );

  const [item, setItem] = useState(propItem || (propId ? null : defaultItem));
  const [showQr, setShowQr] = useState(false);
  const [identifierUnlocked, setIdentifierUnlocked] = useState(false);
  const [confirmUnlockId, setConfirmUnlockId] = useState(false);
  const [confirmDeleteImage, setConfirmDeleteImage] = useState(false);

  const [imageFile, setImageFile] = useState(null);

  const handleFileInput = useCatch(async (newFile) => {
    setImageFile(newFile);
    if (newFile && item?.id) {
      const response = await fetchOrThrow(`/api/devices/${item.id}/image`, {
        method: 'POST',
        body: newFile,
      });
      setItem({ ...item, attributes: { ...item.attributes, deviceImage: await response.text() } });
    } else if (!newFile) {
      const remainingAttributes = { ...(item.attributes || {}) };
      delete remainingAttributes.deviceImage;
      setItem({ ...item, attributes: remainingAttributes });
    }
  });

  const validate = () => item && item.name && item.uniqueId;

  return (
    <EditItemView
      id={propId}
      endpoint="devices"
      item={item}
      setItem={setItem}
      defaultItem={defaultItem}
      validate={validate}
      onItemSaved={(saved) => dispatch(devicesActions.update([saved]))}
      menu={<SettingsMenu />}
      breadcrumbs={['settingsTitle', 'sharedDevice']}
      isDialog={isDialog}
      dialogTitle={item?.id ? 'Edit Device' : 'Add Device'}
      onClose={onClose}
    >
      {item &&
        (isDialog ? (
          item.id ? (
            <>
              <TextField
                value={item.name || ''}
                onChange={(event) => setItem({ ...item, name: event.target.value })}
                label={t('sharedName')}
              />
              <TextField
                value={item.uniqueId || ''}
                onChange={(event) => setItem({ ...item, uniqueId: event.target.value })}
                label={t('deviceIdentifier')}
                helperText={t('deviceIdentifierHelp')}
                disabled={Boolean(uniqueId) || (Boolean(item.id) && !identifierUnlocked)}
                onDoubleClick={() => {
                  if (Boolean(item.id) && !identifierUnlocked) {
                    setConfirmUnlockId(true);
                  }
                }}
              />
              <SelectField
                value={item.groupId}
                onChange={(event) => setItem({ ...item, groupId: Number(event.target.value) })}
                endpoint="/api/groups"
                label={t('groupParent')}
              />
              <TextField
                value={item.model || ''}
                onChange={(event) => setItem({ ...item, model: event.target.value })}
                label={t('deviceModel')}
              />
              <SelectField
                value={item.category || (item.id ? 'default' : 'car')}
                onChange={(event) => setItem({ ...item, category: event.target.value })}
                data={deviceCategories
                  .map((category) => ({
                    id: category,
                    name: t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`),
                  }))
                  .sort((a, b) => a.name.localeCompare(b.name))}
                label={t('deviceCategory')}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileInput(file);
                  }
                  e.target.value = '';
                }}
              />
              {item.attributes?.deviceImage ? (
                <div style={{ position: 'relative', width: '100%', height: 220, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0, 0, 0, 0.23)' }}>
                  <img
                    src={`/api/media/${item.uniqueId}/${item.attributes.deviceImage}`}
                    alt="Device"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => setConfirmDeleteImage(true)}
                    style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
                  >
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </div>
              ) : (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.25,
                  }}
                >
                  + {t('attributeDeviceImage')}
                </Button>
              )}
            </>
          ) : (
            <>
              <TextField
                value={item.name || ''}
                onChange={(event) => setItem({ ...item, name: event.target.value })}
                label={t('sharedName')}
              />
              <TextField
                value={item.uniqueId || ''}
                onChange={(event) => setItem({ ...item, uniqueId: event.target.value })}
                label={t('deviceIdentifier')}
                helperText={t('deviceIdentifierHelp')}
                disabled={Boolean(uniqueId) || (Boolean(item.id) && !identifierUnlocked)}
                onDoubleClick={() => {
                  if (Boolean(item.id) && !identifierUnlocked) {
                    setConfirmUnlockId(true);
                  }
                }}
              />
            </>
          )
        ) : (
          <>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">{t('sharedRequired')}</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.details}>
                <TextField
                  value={item.name || ''}
                  onChange={(event) => setItem({ ...item, name: event.target.value })}
                  label={t('sharedName')}
                />
                <TextField
                  value={item.uniqueId || ''}
                  onChange={(event) => setItem({ ...item, uniqueId: event.target.value })}
                  label={t('deviceIdentifier')}
                  helperText={t('deviceIdentifierHelp')}
                  disabled={Boolean(uniqueId) || (Boolean(item.id) && !identifierUnlocked)}
                  onDoubleClick={() => {
                    if (Boolean(item.id) && !identifierUnlocked) {
                      setConfirmUnlockId(true);
                    }
                  }}
                />
              </AccordionDetails>
            </Accordion>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">{t('sharedExtra')}</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.details}>
                <SelectField
                  value={item.groupId}
                  onChange={(event) => setItem({ ...item, groupId: Number(event.target.value) })}
                  endpoint="/api/groups"
                  label={t('groupParent')}
                />
                <TextField
                  value={item.phone || ''}
                  onChange={(event) => setItem({ ...item, phone: event.target.value })}
                  label={t('sharedPhone')}
                />
                <TextField
                  value={item.model || ''}
                  onChange={(event) => setItem({ ...item, model: event.target.value })}
                  label={t('deviceModel')}
                />
                <TextField
                  value={item.contact || ''}
                  onChange={(event) => setItem({ ...item, contact: event.target.value })}
                  label={t('deviceContact')}
                />
                <SelectField
                  value={item.category || (item.id ? 'default' : 'car')}
                  onChange={(event) => setItem({ ...item, category: event.target.value })}
                  data={deviceCategories
                    .map((category) => ({
                      id: category,
                      name: t(`category${category.replace(/^\w/, (c) => c.toUpperCase())}`),
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name))}
                  label={t('deviceCategory')}
                />
                <SelectField
                  value={item.calendarId}
                  onChange={(event) => setItem({ ...item, calendarId: Number(event.target.value) })}
                  endpoint="/api/calendars"
                  label={t('sharedCalendar')}
                />
                <TextField
                  label={t('userExpirationTime')}
                  type="date"
                  value={item.expirationTime ? item.expirationTime.split('T')[0] : '2099-01-01'}
                  onChange={(e) => {
                    if (e.target.value) {
                      setItem({ ...item, expirationTime: new Date(e.target.value).toISOString() });
                    }
                  }}
                  disabled={!manager}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={item.disabled}
                      onChange={(event) => setItem({ ...item, disabled: event.target.checked })}
                    />
                  }
                  label={t('sharedDisabled')}
                  disabled={!manager}
                />
                <Button variant="outlined" color="primary" onClick={() => setShowQr(true)}>
                  {t('sharedQrCode')}
                </Button>
              </AccordionDetails>
            </Accordion>
            {item.id && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">{t('attributeDeviceImage')}</Typography>
                </AccordionSummary>
                <AccordionDetails className={classes.details}>
                  <FileInput
                    placeholder={t('attributeDeviceImage')}
                    value={imageFile}
                    onChange={handleFileInput}
                    slotProps={{ htmlInput: { accept: 'image/*' } }}
                  />
                </AccordionDetails>
              </Accordion>
            )}
            <EditAttributesAccordion
              attributes={item.attributes}
              setAttributes={(attributes) => setItem({ ...item, attributes })}
              definitions={{ ...commonDeviceAttributes, ...deviceAttributes }}
            />
          </>
        ))}
      {!isDialog && <QrCodeDialog open={showQr} onClose={() => setShowQr(false)} />}
      <Dialog open={confirmUnlockId} onClose={() => setConfirmUnlockId(false)}>
        <DialogTitle>Warning</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to change the device identifier? This may cause the device to stop connecting.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUnlockId(false)}>Cancel</Button>
          <Button onClick={() => { setIdentifierUnlocked(true); setConfirmUnlockId(false); }} color="error">
            Unlock
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmDeleteImage} onClose={() => setConfirmDeleteImage(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove the device image?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteImage(false)}>Cancel</Button>
          <Button onClick={() => { handleFileInput(null); setConfirmDeleteImage(false); }} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </EditItemView>
  );
};

export default DevicePage;
