import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Menu,
} from '@mui/material';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { useTranslation } from '../../common/components/LocalizationProvider';
import useReportStyles from '../common/useReportStyles';
import SelectField from '../../common/components/SelectField';
import { useRestriction } from '../../common/util/permissions';
import { deviceEquality } from '../../common/util/deviceEquality';

export const updateReportParams = (searchParams, setSearchParams, key, values) => {
  const newParams = new URLSearchParams(searchParams);
  newParams.delete(key);
  newParams.delete('from');
  newParams.delete('to');
  values.forEach((value) => newParams.append(key, value));
  setSearchParams(newParams, { replace: true });
};

const ReportFilter = ({ children, onShow, onExport, onSchedule, deviceType, loading, formats }) => {
  const { classes } = useReportStyles();
  const t = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();

  const readonly = useRestriction('readonly');

  const devices = useSelector((state) => state.devices.items, deviceEquality(['id', 'name']));
  const groups = useSelector((state) => state.groups.items);
  const deviceList = useMemo(
    () => [
      { id: 'all', name: t('notificationAlways') },
      ...Object.values(devices).sort((a, b) => a.name.localeCompare(b.name)),
    ],
    [devices, t],
  );
  const groupList = useMemo(
    () => Object.values(groups).sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  );

  const deviceIds = useMemo(
    () => searchParams.getAll('deviceId').map((it) => (it === 'all' ? it : Number(it))),
    [searchParams],
  );
  const groupIds = useMemo(() => searchParams.getAll('groupId').map(Number), [searchParams]);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const [period, setPeriod] = useState('today');
  const [customFrom, setCustomFrom] = useState(() =>
    dayjs().subtract(1, 'hour').locale('en').format('YYYY-MM-DDTHH:mm'),
  );
  const [customTo, setCustomTo] = useState(() => dayjs().locale('en').format('YYYY-MM-DDTHH:mm'));
  const [selectedOption, setSelectedOption] = useState('json');

  const [description, setDescription] = useState();
  const [calendarId, setCalendarId] = useState();

  const [exportAnchorEl, setExportAnchorEl] = useState(null);

  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const evaluateDisabled = () => {
    if (deviceType === 'single' && !deviceIds.length) {
      return true;
    }
    if (deviceType === 'multiple' && !deviceIds.length && !groupIds.length) {
      return true;
    }
    if (selectedOption === 'schedule' && (!description || !calendarId)) {
      return true;
    }
    return loading;
  };
  const disabled = evaluateDisabled();
  const loaded = from && to && !loading;

  const evaluateOptions = () => {
    const result = {
      json: t('reportShow'),
    };
    if (onExport && loaded) {
      formats.forEach((format) => {
        result[format] = `${t('reportExport')} (${format.toUpperCase()})`;
      });
      result.print = t('reportPrint');
    }
    if (onSchedule && !readonly) {
      result.schedule = t('reportSchedule');
    }
    return result;
  };
  const options = evaluateOptions();

  useEffect(() => {
    if (from && to) {
      onShow({ deviceIds: deviceIds.filter((it) => it !== 'all'), groupIds, from, to });
    }
  }, [deviceIds, groupIds, from, to, onShow]);

  const showReport = () => {
    let selectedFrom;
    let selectedTo;
    switch (period) {
      case 'today':
        selectedFrom = dayjs().startOf('day');
        selectedTo = dayjs().endOf('day');
        break;
      case 'yesterday':
        selectedFrom = dayjs().subtract(1, 'day').startOf('day');
        selectedTo = dayjs().subtract(1, 'day').endOf('day');
        break;
      case 'thisWeek':
        selectedFrom = dayjs().startOf('week');
        selectedTo = dayjs().endOf('week');
        break;
      case 'previousWeek':
        selectedFrom = dayjs().subtract(1, 'week').startOf('week');
        selectedTo = dayjs().subtract(1, 'week').endOf('week');
        break;
      case 'thisMonth':
        selectedFrom = dayjs().startOf('month');
        selectedTo = dayjs().endOf('month');
        break;
      case 'previousMonth':
        selectedFrom = dayjs().subtract(1, 'month').startOf('month');
        selectedTo = dayjs().subtract(1, 'month').endOf('month');
        break;
      default:
        selectedFrom = dayjs(customFrom, 'YYYY-MM-DDTHH:mm');
        selectedTo = dayjs(customTo, 'YYYY-MM-DDTHH:mm');
        break;
    }

    const newParams = new URLSearchParams(searchParams);
    newParams.set('from', selectedFrom.toISOString());
    newParams.set('to', selectedTo.toISOString());
    setSearchParams(newParams, { replace: true });
  };

  const onSelected = (type) => {
    switch (type) {
      case 'xlsx':
      case 'csv':
      case 'gpx':
      case 'kml':
      case 'kmz':
        onExport({
          deviceIds: deviceIds.filter((it) => it !== 'all'),
          groupIds,
          from,
          to,
          format: type,
        });
        break;
      case 'print':
        window.print();
        break;
      default:
        setSelectedOption(type);
        break;
    }
  };

  const onClick = (type) => {
    switch (type) {
      case 'schedule':
        onSchedule(
          deviceIds.filter((it) => it !== 'all'),
          groupIds,
          {
            description,
            calendarId,
            attributes: {},
          },
        );
        break;
      case 'json':
      default:
        showReport();
        break;
    }
  };

  return (
    <div className={classes.filter}>
      {deviceType !== 'none' && (
        <div className={classes.filterItem}>
          <SelectField
            label={t(deviceType === 'multiple' ? 'deviceTitle' : 'reportDevice')}
            data={
              deviceType === 'multiple' ? deviceList : deviceList.filter((it) => it.id !== 'all')
            }
            value={deviceType === 'multiple' ? deviceIds : deviceIds.find(() => true)}
            allValue="all"
            onChange={(e) => {
              const values =
                deviceType === 'multiple' ? e.target.value : [e.target.value].filter((id) => id);
              updateReportParams(searchParams, setSearchParams, 'deviceId', values);
            }}
            multiple={deviceType === 'multiple'}
            singleLine={deviceType === 'multiple'}
            fullWidth
          />
        </div>
      )}
      {deviceType === 'multiple' && (
        <div className={classes.filterItem}>
          <SelectField
            label={t('settingsGroups')}
            data={groupList}
            value={groupIds}
            onChange={(e) => {
              const values = e.target.value;
              updateReportParams(searchParams, setSearchParams, 'groupId', values);
            }}
            multiple
            singleLine
            fullWidth
          />
        </div>
      )}
      {selectedOption !== 'schedule' ? (
        <>
          <div className={classes.filterItem}>
            <FormControl fullWidth>
              <InputLabel>{t('reportPeriod')}</InputLabel>
              <Select
                label={t('reportPeriod')}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <MenuItem value="today">{t('reportToday')}</MenuItem>
                <MenuItem value="yesterday">{t('reportYesterday')}</MenuItem>
                <MenuItem value="thisWeek">{t('reportThisWeek')}</MenuItem>
                <MenuItem value="previousWeek">{t('reportPreviousWeek')}</MenuItem>
                <MenuItem value="thisMonth">{t('reportThisMonth')}</MenuItem>
                <MenuItem value="previousMonth">{t('reportPreviousMonth')}</MenuItem>
                <MenuItem value="custom">{t('reportCustom')}</MenuItem>
              </Select>
            </FormControl>
          </div>
          {period === 'custom' && (
            <div className={classes.filterItem}>
              <TextField
                label={t('reportFrom')}
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                fullWidth
              />
            </div>
          )}
          {period === 'custom' && (
            <div className={classes.filterItem}>
              <TextField
                label={t('reportTo')}
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                fullWidth
              />
            </div>
          )}
        </>
      ) : (
        <>
          <div className={classes.filterItem}>
            <TextField
              value={description || ''}
              onChange={(event) => setDescription(event.target.value)}
              label={t('sharedDescription')}
              fullWidth
            />
          </div>
          <div className={classes.filterItem}>
            <SelectField
              value={calendarId}
              onChange={(event) => setCalendarId(Number(event.target.value))}
              endpoint="/api/calendars"
              label={t('sharedCalendar')}
              fullWidth
            />
          </div>
        </>
      )}
      {children}
      <div className={classes.filterItem}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          disabled={disabled}
          onClick={() => onClick(selectedOption)}
        >
          <Typography variant="button" noWrap>
            {selectedOption === 'schedule' ? t('reportSchedule') : t(loading ? 'sharedLoading' : 'reportShow')}
          </Typography>
        </Button>
      </div>
      {Object.keys(options).length > 1 && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            position: 'absolute',
            top: '4px',
            right: '8px',
          }}
        >
          {onExport && (
            <>
              <Tooltip title={t('reportExport')}>
                <span>
                  <IconButton
                    disabled={!loaded || disabled}
                    onClick={handleExportClick}
                    color="primary"
                    size="small"
                  >
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Menu
                anchorEl={exportAnchorEl}
                open={Boolean(exportAnchorEl)}
                onClose={handleExportClose}
              >
                {formats.map((format) => (
                  <MenuItem
                    key={format}
                    onClick={() => {
                      onSelected(format);
                      handleExportClose();
                    }}
                  >
                    {format.toUpperCase()}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
          {onExport && (
            <Tooltip title={t('reportPrint')}>
              <span>
                <IconButton
                  disabled={!loaded || disabled}
                  onClick={() => onSelected('print')}
                  color="primary"
                  size="small"
                >
                  <PrintIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {onSchedule && !readonly && (
            <Tooltip title={t('reportSchedule')}>
              <span>
                <IconButton
                  onClick={() => setSelectedOption(selectedOption === 'schedule' ? 'json' : 'schedule')}
                  color={selectedOption === 'schedule' ? 'secondary' : 'primary'}
                  size="small"
                  sx={selectedOption === 'schedule' ? {
                    backgroundColor: 'action.selected',
                  } : {}}
                >
                  <EventRepeatIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      )}
    </div>
  );
};

export default ReportFilter;
