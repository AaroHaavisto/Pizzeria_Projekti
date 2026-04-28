import {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {getWeeklyMenuData, syncMenuData} from '../api/menuApi';
import {getDefaultMenuData} from '../utils/menuStore';

const MenuDataContext = createContext(null);

export function MenuDataProvider({children}) {
  const [menuData, setMenuDataState] = useState(() => getDefaultMenuData());

  useEffect(() => {
    let cancelled = false;

    async function loadMenuData() {
      try {
        const data = await getWeeklyMenuData();
        if (!cancelled) {
          setMenuDataState(data);
        }
      } catch {
        if (!cancelled) {
          setMenuDataState(getDefaultMenuData());
        }
      }
    }

    loadMenuData();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      menuData,
      async replaceMenuData(nextMenuData) {
        const refreshedMenuData = await syncMenuData(nextMenuData);
        setMenuDataState(refreshedMenuData);
        return refreshedMenuData;
      },
      async restoreDefaultMenu() {
        const refreshedMenuData = await getWeeklyMenuData();
        setMenuDataState(refreshedMenuData);
        return refreshedMenuData;
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
