export let isVerbose = false;
export let isVerboseDebug = false;

export function setVerboseLevel(verbose: boolean, debug: boolean) {
  isVerbose = verbose || debug;
  isVerboseDebug = debug;
}
