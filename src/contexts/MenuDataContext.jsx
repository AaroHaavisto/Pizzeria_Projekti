import {createContext, useContext, useMemo, useState} from 'react';
import {
  getDefaultMenuData,
  getStoredMenuData,
  resetMenuData,
  saveMenuData,
} from '../utils/menuStore';

const MenuDataContext = createContext(null);

export function MenuDataProvider({children}) {
  const [menuData, setMenuDataState] = useState(() => getStoredMenuData());

  const value = useMemo(
    () => ({
      menuData,
      replaceMenuData(nextMenuData) {
        setMenuDataState(nextMenuData);
        saveMenuData(nextMenuData);
      },
      restoreDefaultMenu() {
        const defaultMenuData = getDefaultMenuData();
        resetMenuData();
        setMenuDataState(defaultMenuData);
      },
    }),
    [menuData]
  );

  return (
    <MenuDataContext.Provider value={value}>
      {children}
    </MenuDataContext.Provider>
  );
}

export function useMenuData() {
  const context = useContext(MenuDataContext);

  if (!context) {
    throw new Error('useMenuData must be used within a MenuDataProvider');
  }

  return context;
}
