import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'events',
  initialState: {
    items: [],
  },
  reducers: {
    add(state, action) {
      const newItems = action.payload.filter((newItem) => !state.items.some((item) => item.id === newItem.id));
      if (newItems.length > 0) {
        state.items.unshift(...newItems);
        state.items.splice(50);
      }
    },
    delete(state, action) {
      state.items = state.items.filter((item) => item.id !== action.payload.id);
      try {
        const dismissed = JSON.parse(localStorage.getItem('dismissedEvents') || '[]');
        if (!dismissed.includes(action.payload.id)) {
          dismissed.push(action.payload.id);
          if (dismissed.length > 500) {
            dismissed.shift();
          }
          localStorage.setItem('dismissedEvents', JSON.stringify(dismissed));
        }
      } catch (e) {
        // ignore
      }
    },
    deleteAll(state) {
      try {
        const dismissed = JSON.parse(localStorage.getItem('dismissedEvents') || '[]');
        state.items.forEach((item) => {
          if (!dismissed.includes(item.id)) {
            dismissed.push(item.id);
          }
        });
        if (dismissed.length > 500) {
          dismissed.splice(0, dismissed.length - 500);
        }
        localStorage.setItem('dismissedEvents', JSON.stringify(dismissed));
      } catch (e) {
        // ignore
      }
      state.items = [];
    },
  },
});

export { actions as eventsActions };
export { reducer as eventsReducer };
