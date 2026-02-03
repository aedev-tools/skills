#!/bin/bash
# runner.sh — Detect AE version, execute ExtendScript, return result
# Usage: runner.sh <script.jsx> [args-json]
#
# - Detects installed AE versions in /Applications
# - If multiple found and no cached choice, prints them and exits with code 2
# - Writes args JSON to /tmp/ae-assistant-args.json if provided
# - Executes the .jsx via JXA osascript with error capture
# - Reads result from /tmp/ae-assistant-result.json
# - Logs all executions to ~/.ae-assistant-log
# - Prints result to stdout

set -euo pipefail

CONFIG_FILE="$HOME/.ae-assistant-config"
ARGS_FILE="/tmp/ae-assistant-args.json"
RESULT_FILE="/tmp/ae-assistant-result.json"
ERROR_FILE="/tmp/ae-assistant-error.txt"
LOG_FILE="$HOME/.ae-assistant-log"
SCRIPT_PATH="$1"
ARGS_JSON="${2:-}"

# --- Logging ---

log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $*" >> "$LOG_FILE"
}

# Resolve absolute path for the script
if [[ ! "$SCRIPT_PATH" = /* ]]; then
    SCRIPT_PATH="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)/$(basename "$SCRIPT_PATH")"
fi

log "RUN: $SCRIPT_PATH"
[[ -n "$ARGS_JSON" ]] && log "ARGS: $ARGS_JSON"

# --- AE Version Detection ---

get_cached_version() {
    if [[ -f "$CONFIG_FILE" ]]; then
        cat "$CONFIG_FILE"
    fi
}

set_cached_version() {
    echo "$1" > "$CONFIG_FILE"
}

detect_ae_versions() {
    local versions=()
    for dir in /Applications/Adobe\ After\ Effects*/; do
        if [[ -d "$dir" ]]; then
            local name
            name=$(basename "$dir")
            versions+=("$name")
        fi
    done
    echo "${versions[@]}"
}

AE_APP=$(get_cached_version)

if [[ -z "$AE_APP" ]]; then
    IFS=' ' read -ra VERSIONS <<< "$(detect_ae_versions)"

    if [[ ${#VERSIONS[@]} -eq 0 ]]; then
        log "ERROR: No AE installation found"
        echo '{"error": "No Adobe After Effects installation found in /Applications"}' >&2
        exit 1
    elif [[ ${#VERSIONS[@]} -eq 1 ]]; then
        AE_APP="${VERSIONS[0]}"
        set_cached_version "$AE_APP"
        log "AUTO-DETECTED: $AE_APP"
    else
        log "MULTIPLE AE VERSIONS: ${VERSIONS[*]}"
        echo "Multiple After Effects versions found:"
        for i in "${!VERSIONS[@]}"; do
            echo "  $((i+1)). ${VERSIONS[$i]}"
        done
        echo ""
        echo "Set your preferred version by running:"
        echo "  echo 'Adobe After Effects 2025' > ~/.ae-assistant-config"
        exit 2
    fi
fi

log "AE_APP: $AE_APP"

# --- Write args ---

if [[ -n "$ARGS_JSON" ]]; then
    echo "$ARGS_JSON" > "$ARGS_FILE"
else
    echo '{}' > "$ARGS_FILE"
fi

# --- Clean previous result and error ---

rm -f "$RESULT_FILE"
rm -f "$ERROR_FILE"

# --- Execute via JXA with error capture ---
# The JXA wrapper catches errors at three levels:
# 1. JXA-level errors (AE not running, DoScriptFile fails)
# 2. ExtendScript-level errors (caught by DoScript try/catch wrapper)
# 3. Script-level errors (caught by the script's own try/catch)

JXA_OUTPUT=$(osascript -l JavaScript -e "
    var ae = Application(\"$AE_APP\");
    ae.activate();
    try {
        ae.doscriptfile(\"$SCRIPT_PATH\");
    } catch(e) {
        // Write the JXA-level error to the error file
        var app = Application.currentApplication();
        app.includeStandardAdditions = true;
        app.doShellScript('echo ' + JSON.stringify(String(e)) + ' > /tmp/ae-assistant-error.txt');
    }
" 2>&1) || true

# --- Read result ---

if [[ -f "$RESULT_FILE" ]]; then
    RESULT=$(cat "$RESULT_FILE")
    log "RESULT: $RESULT"
    echo "$RESULT"
elif [[ -f "$ERROR_FILE" ]]; then
    ERROR_MSG=$(cat "$ERROR_FILE")
    log "EXTENDSCRIPT ERROR: $ERROR_MSG"
    echo "{\"error\": \"ExtendScript error\", \"detail\": $ERROR_MSG, \"script\": \"$SCRIPT_PATH\"}"
elif [[ -n "$JXA_OUTPUT" ]]; then
    log "JXA ERROR: $JXA_OUTPUT"
    # Escape the output for JSON
    ESCAPED=$(echo "$JXA_OUTPUT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ')
    echo "{\"error\": \"JXA execution error\", \"detail\": \"$ESCAPED\", \"script\": \"$SCRIPT_PATH\"}"
else
    log "ERROR: No result file produced, no error captured"
    echo "{\"error\": \"Script did not produce a result file and no error was captured. Check if AE has 'Allow Scripts to Write Files and Access Network' enabled in Preferences > Scripting & Expressions.\", \"script\": \"$SCRIPT_PATH\"}"
fi
