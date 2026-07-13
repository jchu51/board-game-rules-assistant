export type RulebookRecord = {
  id: string;
  gameName: string;
  pdfName: string;
  fileSize: number;
};

export type SaveRulebookRecord = RulebookRecord & {
  mimeType: string;
  pdfData: Uint8Array;
};

export interface RulebookRepository {
  save(record: SaveRulebookRecord): Promise<RulebookRecord>;
  deleteById(id: string): Promise<boolean>;
  list(): Promise<RulebookRecord[]>;
}
