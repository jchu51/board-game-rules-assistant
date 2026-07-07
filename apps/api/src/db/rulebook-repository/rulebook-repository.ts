export type RulebookRecord = {
  id: string;
  gameName: string;
  pdfName: string;
  fileSize: number;
};

export interface RulebookRepository {
  create(record: RulebookRecord): RulebookRecord;
  deleteById(id: string): boolean;
  list(): RulebookRecord[];
}
