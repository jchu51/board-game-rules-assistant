import { useCallback, useEffect, useRef, useState } from "react";
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
  SAMPLE_RULEBOOK_DOCUMENTS,
  type RulebookDocument,
  type SelectedRulebookFile,
} from "@/domain/rulebook";

export function UploadPage() {
  const [gameName, setGameName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedRulebookFile | null>(
    null,
  );
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState(SAMPLE_RULEBOOK_DOCUMENTS);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timersRef = useRef<Record<number, number>>({});
  const nextIdRef = useRef(2);

  const startProcessing = useCallback((id: number) => {
    window.clearInterval(timersRef.current[id]);

    timersRef.current[id] = window.setInterval(() => {
      setDocuments((currentDocuments) =>
        currentDocuments.map((document) => {
          if (document.id !== id || document.status !== "processing") {
            return document;
          }

          const nextProgress = Math.min(
            100,
            document.progress + Math.random() * 16 + 6,
          );

          if (nextProgress >= 100) {
            window.clearInterval(timersRef.current[id]);
            delete timersRef.current[id];

            return {
              ...document,
              progress: 100,
              status: "ready",
              pages: Math.floor(Math.random() * 40) + 16,
            };
          }

          return { ...document, progress: nextProgress };
        }),
      );
    }, 700);
  }, []);

  useEffect(() => {
    SAMPLE_RULEBOOK_DOCUMENTS.filter(
      (document) => document.status === "processing",
    ).forEach((document) => startProcessing(document.id));

    const timers = timersRef.current;

    return () => {
      Object.values(timers).forEach(window.clearInterval);
    };
  }, [startProcessing]);

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

    setSelectedFile({ name: file.name, size: file.size });
    setError("");
    setIsDragging(false);
  };

  const handleSubmit = () => {
    const trimmedGameName = gameName.trim();

    if (!selectedFile || !trimmedGameName) return;

    const id = nextIdRef.current;
    nextIdRef.current += 1;

    const document: RulebookDocument = {
      id,
      game: trimmedGameName,
      name: selectedFile.name,
      size: selectedFile.size,
      status: "processing",
      pages: null,
      progress: 4,
    };

    setDocuments((currentDocuments) => [document, ...currentDocuments]);
    setSelectedFile(null);
    setGameName("");
    setError("");
    startProcessing(id);
  };

  const removeDocument = (id: number) => {
    window.clearInterval(timersRef.current[id]);
    delete timersRef.current[id];

    setDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.id !== id),
    );
  };

  const retryDocument = (id: number) => {
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === id
          ? { ...document, status: "processing", progress: 4 }
          : document,
      ),
    );
    startProcessing(id);
  };

  const canSubmit = selectedFile !== null && gameName.trim().length > 0;

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
              Upload &amp; index
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
