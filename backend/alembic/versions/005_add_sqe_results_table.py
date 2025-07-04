"""Add SQE results table

Revision ID: 005
Revises: 004
Create Date: 2024-01-17 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('sqe_results',
    sa.Column('sqe_result_id', sa.Integer(), nullable=False),
    sa.Column('version_id', sa.Integer(), nullable=False),
    sa.Column('average_score', sa.Float(), nullable=False),
    sa.Column('total_test_cases', sa.Integer(), nullable=False),
    sa.Column('test_cases_changed', sa.Boolean(), nullable=True),
    sa.Column('change_percentage', sa.Float(), nullable=True),
    sa.Column('has_one_point_case', sa.Boolean(), nullable=True),
    sa.Column('tested_by_user_id', sa.Integer(), nullable=True),
    sa.Column('test_date', sa.Date(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['tested_by_user_id'], ['users.user_id'], ),
    sa.ForeignKeyConstraint(['version_id'], ['model_versions.version_id'], ),
    sa.PrimaryKeyConstraint('sqe_result_id')
    )
    op.create_index(op.f('ix_sqe_results_sqe_result_id'), 'sqe_results', ['sqe_result_id'], unique=False)
    op.create_index(op.f('ix_sqe_results_version_id'), 'sqe_results', ['version_id'], unique=False)
    op.create_index(op.f('ix_sqe_results_average_score'), 'sqe_results', ['average_score'], unique=False)
    op.create_index(op.f('ix_sqe_results_has_one_point_case'), 'sqe_results', ['has_one_point_case'], unique=False)
    op.create_index(op.f('ix_sqe_results_test_date'), 'sqe_results', ['test_date'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_sqe_results_test_date'), table_name='sqe_results')
    op.drop_index(op.f('ix_sqe_results_has_one_point_case'), table_name='sqe_results')
    op.drop_index(op.f('ix_sqe_results_average_score'), table_name='sqe_results')
    op.drop_index(op.f('ix_sqe_results_version_id'), table_name='sqe_results')
    op.drop_index(op.f('ix_sqe_results_sqe_result_id'), table_name='sqe_results')
    op.drop_table('sqe_results')
    # ### end Alembic commands ### 