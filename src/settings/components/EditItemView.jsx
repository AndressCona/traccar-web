import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Button,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Skeleton,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useCatch, useAsyncTask } from '../../reactHelper';
import { useTranslation } from '../../common/components/LocalizationProvider';
import PageLayout from '../../common/components/PageLayout';
import useSettingsStyles from '../common/useSettingsStyles';
import fetchOrThrow from '../../common/util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
  dialogPaper: {
    borderRadius: theme.spacing(3),
  },
  dialogTitle: {
    fontWeight: 700,
    padding: theme.spacing(2.5, 3, 1),
  },
  dialogContent: {
    '&&': {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2.5),
      padding: theme.spacing(3),
    },
  },
  dialogActions: {
    padding: theme.spacing(1.5, 3, 2.5),
    gap: theme.spacing(1),
  },
  dialogButton: {
    borderRadius: theme.spacing(1.5),
    textTransform: 'none',
    fontWeight: 600,
  },
}));

const EditItemView = ({
  id: propId,
  children,
  endpoint,
  item,
  setItem,
  defaultItem,
  validate,
  onItemSaved,
  menu,
  breadcrumbs,
  isDialog = false,
  dialogTitle,
  open = true,
  onClose,
}) => {
  const navigate = useNavigate();
  const { classes: pageClasses } = useSettingsStyles();
  const { classes: dialogClasses } = useStyles();
  const t = useTranslation();

  const { id: paramId } = useParams();
  const id = propId !== undefined ? propId : paramId;

  useAsyncTask(
    async ({ signal }) => {
      if (!item) {
        if (id) {
          const response = await fetchOrThrow(`/api/${endpoint}/${id}`, { signal });
          setItem(await response.json());
        } else {
          setItem(defaultItem || {});
        }
      }
    },
    [id, item, defaultItem, endpoint, setItem],
  );

  const handleSave = useCatch(async () => {
    let url = `/api/${endpoint}`;
    if (id) {
      url += `/${id}`;
    }

    const response = await fetchOrThrow(url, {
      method: !id ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });

    if (onItemSaved) {
      onItemSaved(await response.json());
    }
    if (isDialog && onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  });

  const handleCancel = () => {
    if (isDialog && onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const content = (
    <Container maxWidth="xs" className={pageClasses.container}>
      {item ? (
        children
      ) : (
        <Accordion defaultExpanded>
          <AccordionSummary>
            <Typography variant="subtitle1">
              <Skeleton width="10em" />
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={-i} width="100%">
                <TextField />
              </Skeleton>
            ))}
          </AccordionDetails>
        </Accordion>
      )}
      {!isDialog && (
        <div className={pageClasses.buttons}>
          <Button color="primary" variant="outlined" onClick={handleCancel} disabled={!item}>
            {t('sharedCancel')}
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={handleSave}
            disabled={!item || !validate()}
          >
            {t('sharedSave')}
          </Button>
        </div>
      )}
    </Container>
  );

  if (isDialog) {
    return (
      <Dialog
        open={open}
        onClose={handleCancel}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { className: dialogClasses.dialogPaper } }}
      >
        <DialogTitle className={dialogClasses.dialogTitle}>
          {dialogTitle || (id ? t('sharedEdit') : 'Add Device')}
        </DialogTitle>
        <DialogContent className={dialogClasses.dialogContent}>
          {item ? (
            children
          ) : (
            <>
              <Skeleton height={56} width="100%" />
              <Skeleton height={56} width="100%" />
            </>
          )}
        </DialogContent>
        <DialogActions className={dialogClasses.dialogActions}>
          <Button onClick={handleCancel} className={dialogClasses.dialogButton}>
            {t('sharedCancel')}
          </Button>
          <Button
            color="primary"
            variant="contained"
            disableElevation
            onClick={handleSave}
            disabled={!item || !validate()}
            className={dialogClasses.dialogButton}
          >
            {t('sharedSave')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <PageLayout menu={menu} breadcrumbs={breadcrumbs}>
      {content}
    </PageLayout>
  );
};

export default EditItemView;
