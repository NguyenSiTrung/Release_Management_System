"""Fix SQE results cascade delete on model version removal

Revision ID: 006
Revises: 005
Create Date: 2025-06-17 02:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    # For SQLite, we need to recreate the table with the new constraint
    # Since SQLite doesn't support dropping foreign key constraints directly
    with op.batch_alter_table('sqe_results') as batch_op:
        # Drop the existing foreign key constraint if it exists
        try:
            batch_op.drop_constraint('fk_sqe_results_version_id_model_versions', type_='foreignkey')
        except:
            pass  # Constraint might not exist or have different name
        
        # Create new foreign key constraint with CASCADE delete
        batch_op.create_foreign_key(
            'fk_sqe_results_version_id_model_versions',
            'model_versions',
            ['version_id'], 
            ['version_id'],
            ondelete='CASCADE'
        )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    # For SQLite, we need to recreate the table with the original constraint
    with op.batch_alter_table('sqe_results') as batch_op:
        # Drop the CASCADE foreign key constraint
        try:
            batch_op.drop_constraint('fk_sqe_results_version_id_model_versions', type_='foreignkey')
        except:
            pass  # Constraint might not exist
        
        # Recreate foreign key constraint without CASCADE delete
        batch_op.create_foreign_key(
            'fk_sqe_results_version_id_original',
            'model_versions',
            ['version_id'], 
            ['version_id']
        )
    # ### end Alembic commands ### 