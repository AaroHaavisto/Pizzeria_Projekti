import {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {
  fetchLunchOffer,
  normalizeLunchOffer,
  updateLunchOffer as updateLunchOfferApi,
} from '../api/offerApi';
import {DEFAULT_LUNCH_OFFER} from '../utils/offer';

const OfferContext = createContext(null);

export function OfferProvider({children}) {
  const [offer, setOffer] = useState(() => ({...DEFAULT_LUNCH_OFFER}));

  useEffect(() => {
    let cancelled = false;

    async function loadOffer() {
      try {
        const nextOffer = await fetchLunchOffer();
        if (!cancelled) {
          setOffer(nextOffer);
        }
      } catch {
        if (!cancelled) {
          setOffer({...DEFAULT_LUNCH_OFFER});
        }
      }
    }

    loadOffer();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      offer,
      async refreshOffer() {
        const nextOffer = await fetchLunchOffer();
        setOffer(nextOffer);
        return nextOffer;
      },
      async saveOffer(nextOffer) {
        const savedOffer = await updateLunchOfferApi(nextOffer);
        const normalizedOffer = normalizeLunchOffer(savedOffer);
        setOffer(normalizedOffer);
        return normalizedOffer;
      },
    }),
    [offer]
  );

  return <OfferContext.Provider value={value}>{children}</OfferContext.Provider>;
}

export function useOffer() {
  const context = useContext(OfferContext);

  if (!context) {
    throw new Error('useOffer must be used within an OfferProvider');
  }

  return context;
}