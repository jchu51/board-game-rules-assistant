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
  const inputRef = useRef<HTMLInputElement | null>(null);

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
    <main className="min-h-full overflow-y-auto bg-background px-6 py-12 text-foreground sm:px-8">
      <div className="mx-auto flex w-full max-w-[784px] flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="text-[38px] leading-[1.1] font-bold tracking-normal">
            Upload a rulebook
          </h1>
          <p className="max-w-3xl text-[17px] leading-7 text-muted-foreground">
            Add a PDF rulebook. We extract the text, keep page numbers intact,
            and index it so answers can be cited back to the source.
          </p>
        </header>

        <Card className="rounded-2xl border-border shadow-[0_1px_3px_rgb(0_0_0_/0.08)]">
          <CardHeader className="p-7 pb-5">
            <CardTitle className="text-xl leading-7 font-bold">
              Rulebook details
            </CardTitle>
            <CardDescription className="text-base leading-6">
              Add the game name and upload the PDF you want to index.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 px-7 pb-5">
            <FieldGroup>
              <Field>
                <FieldLabel
                  id="library-game-name-label"
                  data-testid="library-game-name-label"
                  htmlFor="library-game-name-input"
                  className="text-base font-medium"
                >
                  Game name
                </FieldLabel>
                <Input
                  id="library-game-name-input"
                  data-testid="library-game-name-input"
                  className="h-11 rounded-xl px-4 text-base"
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
          <CardFooter className="justify-end px-7 pb-7">
            <Button
              id="library-upload-submit-btn"
              data-testid="library-upload-submit-btn"
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="h-11 rounded-xl px-5 text-base font-semibold disabled:bg-muted-foreground disabled:text-background disabled:opacity-100"
            >
              {isSubmitting ? "Indexing..." : "Upload & index"}
            </Button>
          </CardFooter>
        </Card>

        <section
          className="flex flex-col gap-4"
          aria-label="Uploaded rulebooks"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold">Your rulebooks</h2>
            <span className="text-base text-muted-foreground">
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
  );
}

export default LibraryPage;
