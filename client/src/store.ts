import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PrintState {
  printer: string;
  copies: string | number;
  colorMode: string;
  paperSize: string;
  orientation: string;
  duplex: string;
  pageRange: string;
  quality: string;
  setPrinter: (printer: string) => void;
  setCopies: (copies: string | number) => void;
  setColorMode: (colorMode: string) => void;
  setPaperSize: (paperSize: string) => void;
  setOrientation: (orientation: string) => void;
  setDuplex: (duplex: string) => void;
  setPageRange: (pageRange: string) => void;
  setQuality: (quality: string) => void;
}

export const usePrintStore = create<PrintState>()(
  persist(
    (set) => ({
      printer: '',
      copies: 1,
      colorMode: 'color',
      paperSize: 'letter',
      orientation: 'portrait',
      duplex: 'none',
      pageRange: '',
      quality: '4',
      setPrinter: (printer) => set({ printer }),
      setCopies: (copies) => set({ copies }),
      setColorMode: (colorMode) => set({ colorMode }),
      setPaperSize: (paperSize) => set({ paperSize }),
      setOrientation: (orientation) => set({ orientation }),
      setDuplex: (duplex) => set({ duplex }),
      setPageRange: (pageRange) => set({ pageRange }),
      setQuality: (quality) => set({ quality }),
    }),
    {
      name: 'printr-settings', // saved in localStorage
    }
  )
);