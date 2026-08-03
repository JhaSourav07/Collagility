import fs from 'fs';
import path from 'path';

export interface ReadPlanResult {
  ok: boolean;
  filePath?: string;
  content: string;
}

export function readPlanArtifact(
  filePathOrName?: string,
  rawContent?: string,
  workspacePath?: string
): ReadPlanResult {
  const candidatePaths: string[] = [];

  // 1. Extract file path from markdown link syntax: [label.md](file:///path/to/file.md) or (file://...)
  if (rawContent) {
    const urlMatches = rawContent.match(/file:\/\/([^\s\)\n\]]+\.md)/g);
    if (urlMatches) {
      for (const m of urlMatches) {
        candidatePaths.push(m.replace(/^file:\/\//, ''));
      }
    }

    const mdLinkMatches = rawContent.match(/\[[^\]]*\.md\]\(([^)]+)\)/g);
    if (mdLinkMatches) {
      for (const m of mdLinkMatches) {
        const link = m.match(/\(([^)]+)\)/)?.[1];
        if (link) {
          candidatePaths.push(link.replace(/^file:\/\//, ''));
        }
      }
    }

    const plainMdMatches = rawContent.match(/([a-zA-Z0-9_\-\/]+\.md)/g);
    if (plainMdMatches) {
      for (const m of plainMdMatches) {
        candidatePaths.push(m);
      }
    }
  }

  if (filePathOrName) {
    candidatePaths.unshift(filePathOrName.replace(/^file:\/\//, ''));
  }

  const baseCwd = workspacePath || process.cwd();

  // Try each candidate path
  for (const rawCandidate of candidatePaths) {
    const cleanPath = rawCandidate.replace(/^file:\/\//, '');

    // Check direct absolute path
    if (path.isAbsolute(cleanPath) && fs.existsSync(cleanPath)) {
      try {
        const fileContent = fs.readFileSync(cleanPath, 'utf-8');
        return { ok: true, filePath: cleanPath, content: fileContent };
      } catch {
        // Continue checking
      }
    }

    // Check relative to current workspace path
    const relPath = path.resolve(baseCwd, cleanPath);
    if (fs.existsSync(relPath)) {
      try {
        const fileContent = fs.readFileSync(relPath, 'utf-8');
        return { ok: true, filePath: relPath, content: fileContent };
      } catch {
        // Continue checking
      }
    }

    // Search in user home directory artifacts if file is under .gemini
    const basename = path.basename(cleanPath);
    if (basename) {
      const homeDir = process.env.HOME || '/home/sourav';
      const homeGeminiPath = path.join(homeDir, '.gemini', 'antigravity-cli', 'brain');
      if (fs.existsSync(homeGeminiPath)) {
        try {
          const subdirs = fs.readdirSync(homeGeminiPath);
          for (const sub of subdirs) {
            const artifactFile = path.join(homeGeminiPath, sub, basename);
            if (fs.existsSync(artifactFile)) {
              const fileContent = fs.readFileSync(artifactFile, 'utf-8');
              return { ok: true, filePath: artifactFile, content: fileContent };
            }
          }
        } catch {
          // Ignore directory search errors
        }
      }
    }
  }

  // Fallback if file content cannot be read from disk
  return {
    ok: false,
    filePath: filePathOrName,
    content: rawContent || `Implementation Plan: ${filePathOrName || 'plan.md'}`,
  };
}
