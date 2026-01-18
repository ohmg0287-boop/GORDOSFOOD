import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExchangeRateSetting } from '@/types/database';

export const useExchangeRate = () => {
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateSetting>({
    bcv: 60,
    parallel: 62,
    active: 'bcv'
  });
  const [loading, setLoading] = useState(true);

  const fetchExchangeRate = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'exchange_rate')
      .maybeSingle();

    if (data && !error) {
      setExchangeRate(data.value as unknown as ExchangeRateSetting);
    }
    setLoading(false);
  };

  const updateExchangeRate = async (newRate: ExchangeRateSetting) => {
    const { error } = await supabase
      .from('settings')
      .update({ value: JSON.parse(JSON.stringify(newRate)) })
      .eq('key', 'exchange_rate');

    if (!error) {
      setExchangeRate(newRate);
    }
    return { error };
  };

  const getCurrentRate = () => {
    return exchangeRate[exchangeRate.active];
  };

  const convertUsdToBs = (usd: number) => {
    return usd * getCurrentRate();
  };

  const convertBsToUsd = (bs: number) => {
    return bs / getCurrentRate();
  };

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  return {
    exchangeRate,
    loading,
    getCurrentRate,
    convertUsdToBs,
    convertBsToUsd,
    updateExchangeRate,
    refetch: fetchExchangeRate
  };
};
