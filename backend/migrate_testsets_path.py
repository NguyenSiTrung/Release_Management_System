#!/usr/bin/env python3
"""
Migration script to update testset file paths from old structure to new structure.

Old structure: storage/models/testsets/
New structure: storage/testsets/

This script updates the database paths to reflect the new directory structure.
"""

import sqlite3
import os
import sys
from pathlib import Path

def migrate_testsets_paths():
    """
    Migrate testset file paths in database from old structure to new structure.
    """
    # Database path
    db_path = "nmt_release_management.db"
    
    if not os.path.exists(db_path):
        print(f"Error: Database file {db_path} not found!")
        return False
    
    print("🔄 Starting testsets path migration...")
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all testsets with file paths
        cursor.execute("""
            SELECT testset_id, source_file_path_on_server, target_file_path_on_server 
            FROM testsets 
            WHERE source_file_path_on_server IS NOT NULL 
               OR target_file_path_on_server IS NOT NULL
        """)
        
        records = cursor.fetchall()
        print(f"📊 Found {len(records)} testset records to migrate")
        
        if not records:
            print("✅ No testset paths to migrate")
            return True
        
        # Process each record
        for testset_id, source_path, target_path in records:
            print(f"\n🔧 Processing testset ID: {testset_id}")
            
            new_source_path = None
            new_target_path = None
            
            # Update source path if exists
            if source_path:
                old_source = source_path
                # Replace /storage/models/testsets/ with /storage/testsets/
                new_source_path = source_path.replace("/storage/models/testsets/", "/storage/testsets/")
                print(f"  📁 Source: {old_source}")
                print(f"  ➡️  New:    {new_source_path}")
                
                # Verify the file exists at new location
                if not os.path.exists(new_source_path):
                    print(f"  ⚠️  Warning: New source file does not exist: {new_source_path}")
            
            # Update target path if exists
            if target_path:
                old_target = target_path
                # Replace /storage/models/testsets/ with /storage/testsets/
                new_target_path = target_path.replace("/storage/models/testsets/", "/storage/testsets/")
                print(f"  📁 Target: {old_target}")
                print(f"  ➡️  New:    {new_target_path}")
                
                # Verify the file exists at new location
                if not os.path.exists(new_target_path):
                    print(f"  ⚠️  Warning: New target file does not exist: {new_target_path}")
            
            # Update database record
            cursor.execute("""
                UPDATE testsets 
                SET source_file_path_on_server = ?, target_file_path_on_server = ?
                WHERE testset_id = ?
            """, (new_source_path, new_target_path, testset_id))
            
            print(f"  ✅ Updated database record for testset {testset_id}")
        
        # Commit changes
        conn.commit()
        print(f"\n✅ Successfully migrated {len(records)} testset records")
        
        # Verify migration
        print("\n🔍 Verifying migration...")
        cursor.execute("""
            SELECT testset_id, source_file_path_on_server, target_file_path_on_server 
            FROM testsets 
            WHERE source_file_path_on_server LIKE '%/storage/models/testsets/%'
               OR target_file_path_on_server LIKE '%/storage/models/testsets/%'
        """)
        
        remaining_old_paths = cursor.fetchall()
        if remaining_old_paths:
            print(f"⚠️  Warning: {len(remaining_old_paths)} records still have old paths:")
            for record in remaining_old_paths:
                print(f"   {record}")
        else:
            print("✅ All testset paths successfully migrated!")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

def main():
    """Main function"""
    print("=" * 60)
    print("🔄 TESTSETS PATH MIGRATION SCRIPT")
    print("=" * 60)
    print("This script migrates testset file paths from:")
    print("  Old: storage/models/testsets/")
    print("  New: storage/testsets/")
    print("=" * 60)
    
    # Confirm before proceeding
    response = input("\nProceed with migration? (y/N): ")
    if response.lower() != 'y':
        print("❌ Migration cancelled")
        return
    
    success = migrate_testsets_paths()
    
    if success:
        print("\n🎉 Migration completed successfully!")
        print("\n💡 Next steps:")
        print("   1. Restart the backend server")
        print("   2. Test testset uploads and downloads")
        print("   3. Verify file paths in the UI")
    else:
        print("\n💥 Migration failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 