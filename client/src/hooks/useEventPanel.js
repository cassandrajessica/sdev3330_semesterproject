import { createContext, useContext } from 'react';

// Lets any card on the page open the event panel without passing a prop
// through every component. Layout provides the real function.
export const EventPanelContext = createContext(() => {});

export default function useEventPanel() {
  return useContext(EventPanelContext);
}
