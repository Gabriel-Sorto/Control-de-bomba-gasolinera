import AsyncStorage from '@react-native-async-storage/async-storage';
import { initialState } from './domain.js';
const KEY = '@gasolinera-azul/v1';
// Único punto de acceso al almacenamiento: reemplazar este adaptador por SQLite.
export const repository = {
  async load() {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return initialState();
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.shifts) || !data.prices) throw Error('No se puede leer el archivo local. No se sobrescribieron los datos.');
    return data;
  },
  async save(state) { await AsyncStorage.setItem(KEY,JSON.stringify(state)); }
};
