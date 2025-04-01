import { FileManager, prompts } from "@openfort/openfort-cli";
import { ViteTemplateTransformer } from "./ViteTemplateTransformer";
import { BaseTemplateTransformer, Template } from "./BaseTemplateTransformer";
import { NextJsTemplateTransformer } from "./NextJsTemplateTransformer";

export class TemplateTransformer {
  static getTransformer(template: string, fileManager: FileManager, verbose = false) {
    switch (template) {
      case "vite":
        return new ViteTemplateTransformer(fileManager, verbose);
      case "nextjs":
        return new NextJsTemplateTransformer(fileManager, verbose);
      default:
        prompts.log.error(`Template transformer for '${template}' not found`);
        return new BaseTemplateTransformer(template as Template, fileManager, verbose);
    }
  }
}
