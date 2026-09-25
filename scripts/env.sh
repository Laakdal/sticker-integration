# Source this in Git Bash before any Android build: `source scripts/env.sh`
export ANDROID_HOME="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
if [ -z "$JAVA_HOME" ] || ! "$JAVA_HOME/bin/java" -version 2>&1 | grep -q 'version "17'; then
  JAVA_HOME="$(ls -d "/c/Program Files/Microsoft/jdk-17"* 2>/dev/null | head -1)"
  export JAVA_HOME
fi
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
