export default {
  MuiUseMediaQuery: {
    defaultProps: {
      noSsr: true,
    },
  },
  MuiPaper: {
    styleOverrides: {
      rounded: {
        borderRadius: '12px',
      },
      root: ({ ownerState }) => ({
        ...(ownerState.square && {
          borderRadius: '12px',
        }),
      }),
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.background.default,
      }),
    },
  },
  MuiButton: {
    styleOverrides: {
      sizeMedium: {
        height: '40px',
      },
    },
  },
  MuiFormControl: {
    defaultProps: {
      size: 'small',
    },
  },
  MuiSnackbar: {
    defaultProps: {
      anchorOrigin: {
        vertical: 'bottom',
        horizontal: 'center',
      },
    },
  },
  MuiTooltip: {
    defaultProps: {
      enterDelay: 500,
      enterNextDelay: 500,
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }) => ({
        '@media print': {
          color: theme.palette.alwaysDark.main,
        },
      }),
    },
  },
  MuiCssBaseline: {
    styleOverrides: (theme) => `
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background-color: ${theme.palette.mode === 'dark' ? '#555' : '#ccc'};
        border-radius: 8px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background-color: ${theme.palette.mode === 'dark' ? '#777' : '#999'};
      }
    `,
  },
};
