/**
 * Test fixtures for package name validation
 */

export const VALID_PACKAGE_NAMES = [
  'my-package',
  'my_package',
  'mypackage',
  'my-package-123',
  'package123',
  '@scope/my-package',
  '@scope/package',
  '@my-scope/my-package-name',
  'a',
  'a1',
  'my-package-with-many-dashes',
  'my_package_with_underscores',
  'mixed-package_name',
]

export const INVALID_PACKAGE_NAMES = [
  'My-Package', // uppercase
  'MY_PACKAGE', // uppercase
  'my package', // spaces
  'my@package', // @ in wrong place
  '', // empty
  'my/package', // forward slash
  'my\\package', // backslash
  'my:package', // colon
  'my;package', // semicolon
  'my|package', // pipe
  'my<package', // less than
  'my>package', // greater than
  'my"package', // quotes
  'my*package', // asterisk
  'my?package', // question mark
  '.my-package', // starts with dot
  '_my-package', // starts with underscore
  'my-package!', // ends with special char
]

export const NAMES_TO_CONVERT: Array<[string, string]> = [
  ['My Package', 'my-package'],
  ['MY_PACKAGE', 'my_package'],
  ['  package  ', 'package'],
  ['package@123', 'package-123'],
  ['.package', 'package'],
  ['_package', 'package'],
  ['my!package', 'my-package'],
  ['my#package$', 'my-package'],
  ['my++package', 'my-package'],
  ['My Cool App', 'my-cool-app'],
  ['Hello World!', 'hello-world'],
  ['test@#$%package', 'test-package'],
]

export const EDGE_CASE_PACKAGE_NAMES = [
  '.',
  '..',
  '...',
  'a',
  'ab',
  'abc',
  '@scope/a',
  'package-with-214-chars-' + 'a'.repeat(200), // Very long name
]

