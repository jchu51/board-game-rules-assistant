import { useRef, useState } from "react";
import { uploadRulebookPdf } from "@/api/rulebook-api";
import { AlertIcon, BookIcon } from "@/assets/svgs";
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
} from "@/domain/rulebook";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function UploadPage() {
  const [gameName, setGameName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<RulebookDocument[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const updateDocument = (id: string, patch: Partial<RulebookDocument>) => {
    setDocuments((currentDocuments) =>
      currentDocuments.map((currentDocument) =>
        currentDocument.id === id
          ? { ...currentDocument, ...patch }
          : currentDocument,
      ),
    );
  };

  const runUpload = async (id: string, file: File): Promise<boolean> => {
    setError("");
    setIsSubmitting(true);

    try {
      await uploadRulebookPdf({ file });
      updateDocument(id, { status: "ready", progress: 100 });
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
      setSelectedFile(null);
      setIsDragging(false);
      return;
    }

    if (file.size > MAX_RULEBOOK_PDF_BYTES) {
      setError("That file is over the 40 MB limit.");
      setSelectedFile(null);
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

    const id = crypto.randomUUID();

    const document: RulebookDocument = {
      id,
      game: trimmedGameName,
      name: selectedFile.name,
      size: selectedFile.size,
      status: "processing",
      pages: null,
      progress: 30,
      file: selectedFile,
    };

    setDocuments((currentDocuments) => [document, ...currentDocuments]);

    const succeeded = await runUpload(id, selectedFile);

    if (succeeded) {
      setSelectedFile(null);
      setGameName("");
    }
  };

  const removeDocument = (id: string) => {
    setDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.id !== id),
    );
  };

  const retryDocument = async (id: string) => {
    const document = documents.find(
      (currentDocument) => currentDocument.id === id,
    );

    if (!document || isSubmitting) return;

    updateDocument(id, { status: "processing", progress: 30 });

    await runUpload(id, document.file);
  };

  const canSubmit =
    selectedFile !== null && gameName.trim().length > 0 && !isSubmitting;

  return (
    <main className="min-h-svh bg-muted/30 px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-7">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookIcon stroke="currentColor" />
            </div>
            <span className="text-sm font-semibold">Rulebook Library</span>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Upload a rulebook
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Add a PDF rulebook. We extract the text, keep page numbers intact,
              and index it so answers can be cited back to the source.
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Rulebook details</CardTitle>
            <CardDescription>
              Add the game name and upload the PDF you want to index.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="game-name">Game name</FieldLabel>
                <Input
                  id="game-name"
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
                  setSelectedFile(null);
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
          <CardFooter className="justify-end">
            <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
              {isSubmitting ? "Indexing..." : "Upload & index"}
            </Button>
          </CardFooter>
        </Card>

        <section
          className="flex flex-col gap-3"
          aria-label="Uploaded rulebooks"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">Your rulebooks</h2>
            <span className="text-sm text-muted-foreground">
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

export default UploadPage;
