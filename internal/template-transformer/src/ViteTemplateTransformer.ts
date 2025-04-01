import { FileManager } from "@openfort/openfort-cli";
import { BaseTemplateTransformer } from "./BaseTemplateTransformer";

export class ViteTemplateTransformer extends BaseTemplateTransformer {
  constructor(fileManager: FileManager, verbose = false) {
    super("vite", fileManager, verbose);
  }

  protected copyRaw(): void {
    this.copyFolder('raw-templates',
      [
        'package.json',
        'src/App.tsx',
        'src/assets/react.svg',
        'public/vite.svg',
      ]
    )
  }

  getEnvName(variable?: string, options?: any): string {
    return `import.meta.env.VITE_${variable}`;
  }


  addEnv(env: Record<string, string | undefined>): void {
    const newEnv = Object.entries(env).reduce((acc, [key, value]) => {
      if (key.startsWith('VITE_')) {
        acc[key] = value;
      } else {
        acc[`VITE_${key}`] = value;
      }
      return acc;
    }, {} as Record<string, string | undefined>);

    super.addEnv(newEnv);
  }
}
