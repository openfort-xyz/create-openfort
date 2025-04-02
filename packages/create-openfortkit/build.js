import fs from 'node:fs';
import path from 'node:path';

const __dirname = path.resolve(path.dirname(''));

function copyDir(srcDir, destDir, ignoreFiles = []) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);

    copy(srcFile, destFile, ignoreFiles);
  }
}

function copy(src, dest, ignoreFiles = []) {
  if (ignoreFiles.some(ignore => ignore === src)) {
    return;
  }
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyDir(src, dest, ignoreFiles);
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Ensure the destination directory exists and copy the folder
try {
  // Get the source and destination paths
  fs.rmSync(path.join(__dirname, 'dist/raw-templates'), { recursive: true, force: true });
  copyDir(
    path.join(__dirname, '../..', 'raw-templates'),
    path.join(__dirname, 'dist', 'raw-templates')
  );

  fs.rmSync(path.join(__dirname, 'dist/updated-files'), { recursive: true, force: true });
  copyDir(
    path.join(__dirname, '../..', 'updated-files'),
    path.join(__dirname, 'dist', 'updated-files')
  );

  console.log('Successfully copied templates to dist');
} catch (err) {
  console.error('Error copying folder:', err);
}
