import { FileManager } from "@openfort/openfort-cli";
import { BaseTemplateTransformer } from "./BaseTemplateTransformer";

export class NextJsTemplateTransformer extends BaseTemplateTransformer {
  constructor(fileManager: FileManager, verbose = false) {
    super("nextjs", fileManager, verbose);
  }

  protected copyRaw(): void {
    this.copyDir(
      this.getFolderDir('raw-templates'),
      [
        'package.json',
      ]
    )
  }

  getEnvName(variable?: string, options?: any): string {
    return `process.env.NEXT_PUBLIC_${variable}!`;
  }


  addEnv(env: Record<string, string | undefined>): void {
    const newEnv = Object.entries(env).reduce((acc, [key, value]) => {
      if (key.startsWith('NEXT_PUBLIC_')) {
        acc[key] = value;
      } else {
        acc[`NEXT_PUBLIC_${key}`] = value;
      }
      return acc;
    }, {} as Record<string, string | undefined>);

    super.addEnv(newEnv);
  }
}
