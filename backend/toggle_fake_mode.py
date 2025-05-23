#!/usr/bin/env python3
"""
Script to toggle fake evaluation mode on/off for testing purposes
"""
import os
import sys
from pathlib import Path

def get_env_file_path():
    """Get the path to .env file"""
    backend_dir = Path(__file__).parent
    env_file = backend_dir / ".env"
    return env_file

def read_env_file(env_file):
    """Read existing .env file content"""
    if env_file.exists():
        with open(env_file, 'r') as f:
            return f.read()
    return ""

def update_fake_mode(enable=True):
    """Update FAKE_EVALUATION_MODE in .env file"""
    env_file = get_env_file_path()
    content = read_env_file(env_file)
    
    # Split into lines
    lines = content.split('\n')
    
    # Look for existing FAKE_EVALUATION_MODE line
    updated = False
    for i, line in enumerate(lines):
        if line.strip().startswith('FAKE_EVALUATION_MODE'):
            lines[i] = f"FAKE_EVALUATION_MODE={'true' if enable else 'false'}"
            updated = True
            break
    
    # If not found, add it
    if not updated:
        if content and not content.endswith('\n'):
            content += '\n'
        lines.append(f"FAKE_EVALUATION_MODE={'true' if enable else 'false'}")
    
    # Write back to file
    with open(env_file, 'w') as f:
        f.write('\n'.join(lines))
    
    print(f"✅ Fake evaluation mode {'ENABLED' if enable else 'DISABLED'}")
    print(f"Updated {env_file}")
    print()
    print("⚠️  IMPORTANT: Please restart the backend server for changes to take effect!")
    print("   You can do this by:")
    print("   1. Stop the current uvicorn process (Ctrl+C)")
    print("   2. Run: uvicorn app.main:app --host 0.0.0.0 --port 8000")

def show_current_status():
    """Show current fake mode status"""
    env_file = get_env_file_path()
    content = read_env_file(env_file)
    
    # Look for FAKE_EVALUATION_MODE setting
    for line in content.split('\n'):
        if line.strip().startswith('FAKE_EVALUATION_MODE'):
            value = line.split('=')[1].strip().lower()
            status = "ENABLED" if value == 'true' else "DISABLED"
            print(f"Current fake evaluation mode: {status}")
            return value == 'true'
    
    print("Current fake evaluation mode: DISABLED (not set)")
    return False

def main():
    if len(sys.argv) < 2:
        print("Fake Evaluation Mode Toggle Script")
        print("=" * 40)
        print()
        show_current_status()
        print()
        print("Usage:")
        print("  python toggle_fake_mode.py on     # Enable fake mode")
        print("  python toggle_fake_mode.py off    # Disable fake mode")
        print("  python toggle_fake_mode.py status # Show current status")
        print()
        print("What fake mode does:")
        print("- Skips Docker translation engine")
        print("- Creates fake output files with Thai text: 'นี่คือข้อความทดสอบภาษาไทย'")
        print("- Generates realistic fake BLEU (15-35) and COMET (0.6-0.85) scores")
        print("- Allows testing of download and comparison features")
        return
    
    command = sys.argv[1].lower()
    
    if command in ['on', 'enable', 'true']:
        update_fake_mode(True)
    elif command in ['off', 'disable', 'false']:
        update_fake_mode(False)
    elif command in ['status', 'show']:
        print("Fake Evaluation Mode Status")
        print("=" * 30)
        show_current_status()
    else:
        print(f"Unknown command: {command}")
        print("Use 'on', 'off', or 'status'")

if __name__ == "__main__":
    main() 