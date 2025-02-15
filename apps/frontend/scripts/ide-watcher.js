import { watch } from 'fs/promises';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');

async function watchDirectory(dir) {
  try {
    const watcher = watch(dir, { recursive: true });
    console.log(chalk.blue(`[IDE Watcher] Started watching ${relative(process.cwd(), dir)}`));

    for await (const event of watcher) {
      const relativePath = relative(rootDir, join(dir, event.filename));
      
      // Ignore node_modules, dist, and extension directories
      if (relativePath.includes('node_modules') || 
          relativePath.includes('dist') || 
          relativePath.includes('extension')) {
        continue;
      }

      switch (event.eventType) {
        case 'change':
          console.log(chalk.green(`[IDE] Modified: ${relativePath}`));
          break;
        case 'rename':
          const exists = await fs.access(join(dir, event.filename))
            .then(() => true)
            .catch(() => false);
          
          if (exists) {
            console.log(chalk.yellow(`[IDE] Added: ${relativePath}`));
          } else {
            console.log(chalk.red(`[IDE] Deleted: ${relativePath}`));
          }
          break;
      }
    }
  } catch (error) {
    console.error(chalk.red(`[IDE Watcher] Error: ${error.message}`));
    process.exit(1);
  }
}

// Start watching the src directory
watchDirectory(join(rootDir, 'src'));
console.log(chalk.blue('[IDE Watcher] Initialized. Press Ctrl+C to stop.')); 