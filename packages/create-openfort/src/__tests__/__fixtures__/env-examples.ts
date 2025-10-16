/**
 * Test fixtures for .env.example files
 */

export const BASIC_ENV_EXAMPLE = `OPENFORT_PUBLISHABLE_KEY=
SHIELD_PUBLISHABLE_KEY=
CREATE_ENCRYPTED_SESSION_ENDPOINT=`

export const ENV_WITH_COMMENTS = `# Openfort Configuration
# Get your keys from https://dashboard.openfort.io

# Publishable key (safe to expose in client)
OPENFORT_PUBLISHABLE_KEY=

# Shield Configuration
SHIELD_PUBLISHABLE_KEY=

# Backend endpoint for automatic recovery
CREATE_ENCRYPTED_SESSION_ENDPOINT=`

export const ENV_WITH_DEFAULTS = `OPENFORT_PUBLISHABLE_KEY=pk_test_default
SHIELD_PUBLISHABLE_KEY=shield_default
CREATE_ENCRYPTED_SESSION_ENDPOINT=http://localhost:3110/api`

export const ENV_WITH_OPTIONAL = `# Required
OPENFORT_PUBLISHABLE_KEY=
SHIELD_PUBLISHABLE_KEY=

# Optional
OPENFORT_THEME=
CREATE_ENCRYPTED_SESSION_ENDPOINT=`

export const BACKEND_ENV_EXAMPLE = `# Openfort Backend Configuration
OPENFORT_SECRET_KEY=
SHIELD_SECRET_KEY=
SHIELD_API_KEY=
SHIELD_ENCRYPTION_SHARE=
PORT=3110`

export const COMPLEX_ENV_EXAMPLE = `# Frontend Environment Variables
NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=
NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY=
NEXT_PUBLIC_CREATE_ENCRYPTED_SESSION_ENDPOINT=

# Optional Theme
NEXT_PUBLIC_OPENFORT_THEME=auto

# Backend URL (for development)
NEXT_PUBLIC_API_URL=http://localhost:3110

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_ID=`

export const EMPTY_ENV = ``

export const COMMENTS_ONLY_ENV = `# This is a comment
# Another comment
# More comments`

export const ENV_WITH_SPECIAL_CHARS = `API_URL=https://api.example.com/v1?key=value&other=123
SECRET_KEY=abc123!@#$%^&*()
BASE64_VALUE=SGVsbG8gV29ybGQhCg==`
