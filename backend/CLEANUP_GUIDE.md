# Temporary Evaluation Cleanup Guide

## ⚠️ IMPORTANT WARNING

**DO NOT run this cleanup automatically!** Users may still need access to translation output files even after evaluation jobs are completed. This script should only be run manually by administrators after confirming with users.

## Overview

The `cleanup_temp_evaluations.py` script helps remove old temporary evaluation directories to free up disk space. It uses multiple safety checks to avoid deleting files that users might still need.

## Safety Features

1. **Age-based cleanup**: Only deletes directories older than specified days (default: 7 days)
2. **Active job protection**: Never deletes directories for jobs that are still running
3. **Recent completion protection**: Keeps directories for recently completed jobs
4. **Dry run mode**: Shows what would be deleted without actually deleting (default mode)
5. **User confirmation**: Requires manual confirmation before deleting files

## Usage Examples

### 1. Check what would be deleted (safe preview)
```bash
cd backend
python cleanup_temp_evaluations.py --dry-run --days-old 7
```

### 2. Check older files (14+ days old)
```bash
python cleanup_temp_evaluations.py --dry-run --days-old 14
```

### 3. Actually delete files (CAREFUL!)
```bash
python cleanup_temp_evaluations.py --live --days-old 14
```

## Command Line Options

- `--days-old N`: Only delete directories older than N days (default: 7)
- `--dry-run`: Show what would be deleted without actually deleting (default: true)
- `--live`: Actually delete files (requires confirmation)

## What Gets Deleted

The script will DELETE directories that are:
- ✅ Older than the specified age threshold
- ✅ For jobs that are completed/failed (not active)
- ✅ Orphaned directories (job not found in database)

## What Gets Kept

The script will KEEP directories that are:
- 🛡️ For jobs that are still active (PENDING, PREPARING_SETUP, etc.)
- 🛡️ For jobs completed within the age threshold
- 🛡️ Younger than the age threshold (regardless of job status)

## Recommended Workflow

1. **Check disk usage** first:
   ```bash
   du -sh storage/temp/evaluation_temp/
   ```

2. **Run dry-run** to see what would be deleted:
   ```bash
   python cleanup_temp_evaluations.py --dry-run --days-old 14
   ```

3. **Notify users** if you plan to delete files they might need

4. **Run actual cleanup** if safe:
   ```bash
   python cleanup_temp_evaluations.py --live --days-old 14
   ```

## Example Output

```
2025-01-06 10:30:45 - INFO - Starting cleanup of temp evaluation directories (dry_run=True)...
2025-01-06 10:30:45 - INFO - Will only consider directories older than 7 days
2025-01-06 10:30:45 - WARNING - DRY RUN MODE - No files will actually be deleted
2025-01-06 10:30:45 - INFO - Found 15 total jobs in database
2025-01-06 10:30:45 - INFO - Found 0 active jobs in database
2025-01-06 10:30:45 - INFO - Found 3 jobs completed within 7 days
2025-01-06 10:30:45 - INFO - KEEP: evaluation_45 (15.32 MB, 2 days old): job completed recently (less than 7 days ago)
2025-01-06 10:30:45 - INFO - DELETE: evaluation_31 (23.45 MB, 10 days old): old completed/failed job (10 days old)
2025-01-06 10:30:45 - INFO - DRY RUN completed: 12 would be deleted (245.67 MB), 3 kept, 0 errors
```

## Best Practices

- **Always run dry-run first** to see what would be deleted
- **Use longer age thresholds** (14+ days) to be safer
- **Check with users** before deleting files they might need
- **Monitor disk usage** regularly instead of aggressive cleanup
- **Consider archiving** instead of deleting for important evaluations

## Emergency Recovery

If files are accidentally deleted:
- Check if you have recent backups
- Re-run the evaluation if the model and testset are still available
- Translation outputs can be regenerated using the saved model files 