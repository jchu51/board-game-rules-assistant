import { extname, isAbsolute, relative, resolve } from "node:path";

export type ResolveContainedPathOptions = {
  allowedExtensions?: string[];
  baseDirectory: string;
  requestedPath: string;
};

export const resolveContainedPath = ({
  allowedExtensions,
  baseDirectory,
  requestedPath,
}: ResolveContainedPathOptions): string | undefined => {
  if (!requestedPath || isAbsolute(requestedPath)) {
    return undefined;
  }

  const resolvedBaseDirectory = resolve(baseDirectory);
  const resolvedPath = resolve(resolvedBaseDirectory, requestedPath);
  const relativePath = relative(resolvedBaseDirectory, resolvedPath);
  const isOutsideBaseDirectory =
    relativePath.startsWith("..") || isAbsolute(relativePath);

  if (isOutsideBaseDirectory) {
    return undefined;
  }

  if (allowedExtensions) {
    const extension = extname(resolvedPath).toLowerCase();
    const isAllowedExtension = allowedExtensions.some(
      (allowedExtension) => allowedExtension.toLowerCase() === extension,
    );

    if (!isAllowedExtension) {
      return undefined;
    }
  }

  return resolvedPath;
};
