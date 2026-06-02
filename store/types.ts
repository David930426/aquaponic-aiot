export interface AlertState {
  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  toggleSheet: () => void;
}

export interface ZoneState {
  selectedZoneId: string;
  setSelectedZoneId: (id: string) => void;
}
