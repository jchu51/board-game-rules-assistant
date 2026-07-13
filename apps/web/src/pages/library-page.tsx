import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  deleteRulebook,
  listRulebooks,
  uploadRulebookPdf,
} from "@/api/rulebook-api";
import { AlertIcon } from "@/assets/svgs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LibraryHeader } from "@/components/library-header";
import { MobileAppDrawer } from "@/components/mobile-app-drawer";
import {
  DocumentCard,
  Dropzone,
  SelectedFileCard,
} from "@/components/rulebook-upload";
import {
  MAX_RULEBOOK_PDF_BYTES,
  type RulebookDocument,
  type RulebookSummary,
} from "@/domain/rulebook";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const createRulebookDocument = (
  rulebook: RulebookSummary,
): RulebookDocument => ({
  id: rulebook.id,
  gameName: rulebook.gameName,
  pdfName: rulebook.pdfName,
  size: rulebook.fileSize,
  isPersisted: true,
  status: "ready",
  pages: null,
  progress: 100,
});

export function LibraryPage() {
  const [gameName, setGameName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<RulebookDocument[]>([]);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const clearSelectedFile = () => {
    setSelectedFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  useEffect(() => {
    let isMounted = true;

    void listRulebooks()
      .then(({ rulebooks }) => {
        if (!isMounted) return;

        setDocuments(rulebooks.map(createRulebookDocument));
      })
      .catch((loadError: unknown) => {
        if (!isMounted) return;

        setError(getErrorMessage(loadError, "Failed to load rulebooks"));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateDocument = (id: string, patch: Partial<RulebookDocument>) => {
    setDocuments((currentDocuments) =>
      currentDocuments.map((currentDocument) =>
        currentDocument.id === id
          ? { ...currentDocument, ...patch }
          : currentDocument,
      ),
    );
  };

  const runUpload = async (
    id: string,
    file: File,
    rulebookGameName: string,
  ): Promise<boolean> => {
    setError("");
    setIsSubmitting(true);

    try {
      const uploadedRulebook = await uploadRulebookPdf({
        file,
        gameName: rulebookGameName,
      });
      updateDocument(id, {
        id: uploadedRulebook.id,
        gameName: uploadedRulebook.gameName,
        pdfName: uploadedRulebook.pdfName,
        size: uploadedRulebook.fileSize,
        isPersisted: true,
        status: "ready",
        progress: 100,
      });
      return true;
    } catch (uploadError) {
      updateDocument(id, { status: "error", progress: 100 });
      setError(getErrorMessage(uploadError, "Failed to upload rulebook PDF"));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const acceptFile = (file: File | undefined) => {
    if (!file) return;

    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

    if (!isPdf) {
      setError("That file isn't a PDF. Please upload a .pdf rulebook.");
      clearSelectedFile();
      setIsDragging(false);
      return;
    }

    if (file.size > MAX_RULEBOOK_PDF_BYTES) {
      setError("That file is over the 40 MB limit.");
      clearSelectedFile();
      setIsDragging(false);
      return;
    }

    setSelectedFile(file);
    setError("");
    setIsDragging(false);
  };

  const handleSubmit = async () => {
    const trimmedGameName = gameName.trim();

    if (!selectedFile || !trimmedGameName || isSubmitting) return;

    const id = uuidv4();

    const document: RulebookDocument = {
      id,
      gameName: trimmedGameName,
      pdfName: selectedFile.name,
      size: selectedFile.size,
      isPersisted: false,
      status: "processing",
      pages: null,
      progress: 30,
      file: selectedFile,
    };

    setDocuments((currentDocuments) => [document, ...currentDocuments]);

    const succeeded = await runUpload(id, selectedFile, trimmedGameName);

    if (succeeded) {
      clearSelectedFile();
      setGameName("");
    }
  };

  const removeDocument = async (id: string) => {
    const removedDocument = documents.find((document) => document.id === id);

    setDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.id !== id),
    );

    if (!removedDocument?.isPersisted) return;

    try {
      await deleteRulebook(id);
    } catch (deleteError) {
      setDocuments((currentDocuments) => [
        removedDocument,
        ...currentDocuments,
      ]);
      setError(getErrorMessage(deleteError, "Failed to delete rulebook"));
    }
  };

  const retryDocument = async (id: string) => {
    const document = documents.find(
      (currentDocument) => currentDocument.id === id,
    );

    if (!document || !document.file || isSubmitting) return;

    updateDocument(id, { status: "processing", progress: 30 });

    await runUpload(id, document.file, document.gameName);
  };

  const canSubmit =
    selectedFile !== null && gameName.trim().length > 0 && !isSubmitting;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fcfbfa] text-[#14171f]">
      <LibraryHeader
        menuButtonRef={menuButtonRef}
        navigationOpen={navigationOpen}
        onMenuClick={() => setNavigationOpen(true)}
      />
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-8">
        <div className="mx-auto flex w-full max-w-[768px] flex-col gap-7">
          <div className="flex flex-col gap-3">
            <h1 className="font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.4px]">
              Upload a rulebook
            </h1>
            <p className="max-w-2xl text-[14.5px] leading-[1.6] text-[#5b5648]">
              Add a PDF rulebook. We extract the text, keep page numbers intact,
              and index it so answers can be cited back to the source.
            </p>
          </div>

          <Card className="rounded-[18px] border-[#edeae3] shadow-[0_10px_30px_-18px_rgba(109,94,240,0.15)]">
            <CardHeader className="p-6 pb-5">
              <CardTitle className="font-heading text-base leading-6 font-semibold">
                Rulebook details
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-[#5b5648]">
                Add the game name and upload the PDF you want to index.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 px-6 pb-5">
              <FieldGroup>
                <Field>
                  <FieldLabel
                    id="library-game-name-label"
                    data-testid="library-game-name-label"
                    htmlFor="library-game-name-input"
                    className="text-sm font-semibold"
                  >
                    Game name
                  </FieldLabel>
                  <Input
                    id="library-game-name-input"
                    data-testid="library-game-name-input"
                    className="h-10 rounded-[10px] border-[#edeae3] px-3.5 text-sm focus-visible:ring-[#6d5ef0]/20"
                    value={gameName}
                    onChange={(event) => setGameName(event.target.value)}
                    placeholder="e.g. Catan"
                  />
                </Field>
              </FieldGroup>

              {selectedFile ? (
                <SelectedFileCard
                  file={selectedFile}
                  onClear={() => {
                    clearSelectedFile();
                    setError("");
                  }}
                />
              ) : (
                <Dropzone
                  isDragging={isDragging}
                  onBrowse={() => inputRef.current?.click()}
                  onDragStateChange={setIsDragging}
                  onFile={acceptFile}
                />
              )}

              <input
                id="library-rulebook-file-input"
                data-testid="library-rulebook-file-input"
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => acceptFile(event.target.files?.[0])}
              />

              {error ? (
                <Alert variant="destructive">
                  <AlertIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
            <CardFooter className="justify-end px-6 pb-6">
              <Button
                id="library-upload-submit-btn"
                data-testid="library-upload-submit-btn"
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="h-[38px] rounded-full bg-[#6d5ef0] px-[18px] text-sm font-semibold text-white hover:bg-[#5848d9] disabled:opacity-50"
              >
                {isSubmitting ? "Indexing..." : "Upload & index"}
              </Button>
            </CardFooter>
          </Card>

          <section
            className="flex flex-col gap-3"
            aria-label="Uploaded rulebooks"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-heading text-base font-semibold">
                Your rulebooks
              </h2>
              <span className="text-[13.5px] text-[#b8b2a6]">
                {documents.length}{" "}
                {documents.length === 1 ? "document" : "documents"}
              </span>
            </div>

            {documents.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No rulebooks yet</EmptyTitle>
                  <EmptyDescription>
                    Your indexed rulebooks will appear here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-3">
                {documents.map((document) => (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    onRemove={removeDocument}
                    onRetry={retryDocument}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <MobileAppDrawer
        menuButtonRef={menuButtonRef}
        open={navigationOpen}
        onClose={() => setNavigationOpen(false)}
      />
    </div>
  );
}

export default LibraryPage;
