import { FileManager } from "@openfort/openfort-cli";
import { ViteTemplateTransformer } from "./ViteTemplateTransformer";

export class TemplateTransformer {
  static getTransformer(template: string, fileManager: FileManager, verbose = false) {
    switch (template) {
      case "vite":
        return new ViteTemplateTransformer(fileManager, verbose);
      default:
        throw new Error(`Template '${template}' not found`);
    }
  }
}
