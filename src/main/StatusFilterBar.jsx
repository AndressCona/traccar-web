import React from 'react';
import { Box, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useSelector } from 'react-redux';

const useStyles = makeStyles()((theme) => ({
    container: {
        display: 'flex',
        gap: theme.spacing(1),
        padding: theme.spacing(1.5),
        paddingBottom: 0,
        width: '100%',
        boxSizing: 'border-box',
    },
    button: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing(1),
        borderRadius: '12px',
        cursor: 'pointer',
        border: '1px solid transparent',
        transition: 'background-color 0.2s, box-shadow 0.2s, color 0.2s',
        backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        boxSizing: 'border-box',
        '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.06)',
        },
    },
    title: {
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
    },
    count: {
        fontSize: '1.1rem',
        fontWeight: 700,
        marginTop: theme.spacing(0.5),
    },
    active: {
        boxShadow: 'none !important',
    },
    allActive: {
        backgroundColor: theme.palette.primary.main,
        color: '#fff',
    },
    onlineActive: {
        backgroundColor: theme.palette.success.main,
        color: '#fff',
    },
    offlineActive: {
        backgroundColor: theme.palette.error.main,
        color: '#fff',
    },
    alarmActive: {
        backgroundColor: theme.palette.warning.main,
        color: '#fff',
    },
}));

const StatusFilterBar = ({ filter, setFilter }) => {
    const { classes } = useStyles();
    const t = useTranslation();

    const devices = useSelector((state) => state.devices.items) || {};
    const positions = useSelector((state) => state.session.positions) || {};

    const onlineCount = Object.values(devices).filter(d => d.status === 'online').length;
    const offlineCount = Object.values(devices).filter(d => d.status === 'offline' || d.status === 'unknown').length;
    const alarmCount = Object.values(devices).filter(d => !!positions[d.id]?.attributes?.alarm).length;
    const allCount = Object.keys(devices).length;

    const currentStatus = (filter.statuses && filter.statuses.length > 0) ? filter.statuses[0] : 'all';

    const setStatus = (status) => {
        if (status === 'all') {
            setFilter({ ...filter, statuses: [] });
        } else if (status === 'offline') {
            setFilter({ ...filter, statuses: ['offline', 'unknown'] });
        } else {
            setFilter({ ...filter, statuses: [status] });
        }
    };

    return (
        <Box className={classes.container}>
            <Box
                className={`${classes.button} ${currentStatus === 'all' ? `${classes.active} ${classes.allActive}` : ''}`}
                onClick={() => setStatus('all')}
            >
                <Typography className={classes.title}>All</Typography>
                <Typography className={classes.count}>{allCount}</Typography>
            </Box>
            <Box
                className={`${classes.button} ${currentStatus === 'online' ? `${classes.active} ${classes.onlineActive}` : ''}`}
                onClick={() => setStatus('online')}
            >
                <Typography className={classes.title}>Online</Typography>
                <Typography className={classes.count}>{onlineCount}</Typography>
            </Box>
            <Box
                className={`${classes.button} ${currentStatus === 'offline' ? `${classes.active} ${classes.offlineActive}` : ''}`}
                onClick={() => setStatus('offline')}
            >
                <Typography className={classes.title}>Offline</Typography>
                <Typography className={classes.count}>{offlineCount}</Typography>
            </Box>
            <Box
                className={`${classes.button} ${currentStatus === 'alarm' ? `${classes.active} ${classes.alarmActive}` : ''}`}
                onClick={() => setStatus('alarm')}
            >
                <Typography className={classes.title}>Alarm</Typography>
                <Typography className={classes.count}>{alarmCount}</Typography>
            </Box>
        </Box>
    );
};

export default StatusFilterBar;
