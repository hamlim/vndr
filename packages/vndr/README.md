# vndr

A lightweight CLI tool for downloading packages, repositories, and files from various sources. `vndr` makes it easy to vendor dependencies by downloading them into a local directory.

## Features

- 📦 Download npm packages
- 🐙 Download GitHub repositories
- 📁 Download specific directories from GitHub
- 📄 Download individual files from GitHub or any URL
- 🎯 Customizable target directory
- 🚀 Zero dependencies - uses only Node.js built-ins

## Installation

```bash
# Install globally with npm
npm install -g vndr

# Or use directly with npx
npx vndr <package>

# Or use with bunx
bunx vndr <package>
```

## Usage

```bash
vndr <package...> [--dir <path>]
```

### Options

- `--dir, -d`: Specify target directory (default: "./vndr")

### Examples

```bash
# Download an npm package
vndr express

# Download multiple npm packages
vndr express lodash moment

# Download a GitHub repository
vndr vercel/next.js

# Download a specific directory from GitHub
vndr https://github.com/vercel/next.js/tree/main/examples

# Download a specific file from GitHub
vndr https://github.com/vercel/next.js/blob/main/package.json

# Download to a custom directory
vndr express --dir vendor

# Download any file from a URL
vndr https://example.com/file.js
```

## How it works

`vndr` intelligently handles different types of inputs:

1. **npm packages**: 
   - Creates a temporary directory
   - Installs the package using npm
   - Copies the package contents to your target directory
   - Cleans up temporary files

2. **GitHub repositories**:
   - Performs a shallow clone (--depth 1)
   - Copies files to your target directory
   - Removes `.git` directory
   - Supports both repository names (user/repo) and URLs

3. **GitHub directories**:
   - Clones the repository temporarily
   - Extracts only the specified directory
   - Maintains the original directory structure

4. **Files**:
   - Downloads directly using fetch
   - Supports both GitHub file URLs and regular URLs
   - Automatically converts GitHub blob URLs to raw URLs

## Notes

- All downloads are placed in the `./vndr` directory by default
- Use `--dir` to specify a different target directory
- GitHub repository downloads are shallow clones to minimize download size
- npm package downloads include only the package contents, not its dependencies

## License

MIT
