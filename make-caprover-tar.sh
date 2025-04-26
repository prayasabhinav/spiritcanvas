#!/bin/bash

# make-caprover-tar.sh
# Usage: ./make-caprover-tar.sh [express|auth|mongodb|full]
# Creates a CapRover-compatible .tar file for deployment, including only the necessary files for the specified stage.

set -e

STAGE="$1"
if [[ -z "$STAGE" ]]; then
  echo "Usage: $0 [express|auth|mongodb|full]"
  exit 1
fi

APP_NAME="spiritcanvas"
TMP_DIR="/tmp/${APP_NAME}_deploy_$$"
TAR_FILE="${APP_NAME}-${STAGE}.tar"

# Clean up temp dir on exit
trap "rm -rf $TMP_DIR" EXIT

mkdir -p "$TMP_DIR"

echo "[DEBUG] Stage: $STAGE"

# Always include these files
REQUIRED_FILES=(package.json package-lock.json server.js captain-definition views index.html style.css script.js)
for f in "${REQUIRED_FILES[@]}"; do
  if [[ -e "$f" ]]; then
    echo "[DEBUG] Copying $f"
  else
    echo "[WARNING] $f not found!"
  fi
  if [[ -d "$f" ]]; then
    cp -r "$f" "$TMP_DIR/" 2>/dev/null || true
  else
    cp "$f" "$TMP_DIR/" 2>/dev/null || true
  fi
done

if [[ "$STAGE" == "auth" ]]; then
  echo "[DEBUG] Including auth-related files"
  mkdir -p "$TMP_DIR/routes" "$TMP_DIR/config" "$TMP_DIR/middleware"
  for f in routes/auth.js config/passport.js middleware/auth.js admins.txt; do
    if [[ -e "$f" ]]; then
      echo "[DEBUG] Copying $f"
      cp "$f" "$TMP_DIR/${f%/*}/" 2>/dev/null || true
    else
      echo "[WARNING] $f not found!"
    fi
  done
  if [[ -d models ]]; then
    echo "[DEBUG] Copying models/"
    cp -r models "$TMP_DIR/" 2>/dev/null || true
  else
    echo "[WARNING] models/ directory not found!"
  fi
fi

if [[ "$STAGE" == "mongodb" ]]; then
  echo "[DEBUG] Including mongodb-related files"
  mkdir -p "$TMP_DIR/routes" "$TMP_DIR/config" "$TMP_DIR/middleware"
  for f in routes/auth.js config/passport.js middleware/auth.js admins.txt; do
    if [[ -e "$f" ]]; then
      echo "[DEBUG] Copying $f"
      cp "$f" "$TMP_DIR/${f%/*}/" 2>/dev/null || true
    else
      echo "[WARNING] $f not found!"
    fi
  done
  if [[ -d models ]]; then
    echo "[DEBUG] Copying models/"
    cp -r models "$TMP_DIR/" 2>/dev/null || true
  else
    echo "[WARNING] models/ directory not found!"
  fi
  if [[ -e middleware/admin.js ]]; then
    echo "[DEBUG] Copying middleware/admin.js"
    cp middleware/admin.js "$TMP_DIR/middleware/" 2>/dev/null || true
  else
    echo "[WARNING] middleware/admin.js not found!"
  fi
fi

if [[ "$STAGE" == "full" ]]; then
  echo "[DEBUG] Including all files for full app"
  for d in routes config middleware models; do
    if [[ -d $d ]]; then
      echo "[DEBUG] Copying $d/"
      cp -r "$d" "$TMP_DIR/" 2>/dev/null || true
    else
      echo "[WARNING] $d/ directory not found!"
    fi
  done
  if [[ -e admins.txt ]]; then
    echo "[DEBUG] Copying admins.txt"
    cp admins.txt "$TMP_DIR/" 2>/dev/null || true
  else
    echo "[WARNING] admins.txt not found!"
  fi
fi

# Remove node_modules if present in temp dir
rm -rf "$TMP_DIR/node_modules"

echo "[DEBUG] Contents of $TMP_DIR before tarring:"
ls -lR "$TMP_DIR"

# Create the tar file
TAR_PATH="$(pwd)/$TAR_FILE"
tar -cf "$TAR_PATH" -C "$TMP_DIR" . || { echo "[ERROR] tar command failed"; exit 2; }

# Output result
if [[ -f "$TAR_FILE" ]]; then
  echo "Created $TAR_FILE for stage '$STAGE'"
else
  echo "Failed to create $TAR_FILE"
  exit 2
fi 