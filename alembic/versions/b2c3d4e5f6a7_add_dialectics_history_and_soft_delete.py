"""add_dialectics_history_and_soft_delete

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-01 04:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('dialectics_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dialectics_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('content_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['dialectics_id'], ['dialectics.id'], name=op.f('fk_dialectics_history_dialectics_id_dialectics'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_dialectics_history'))
    )
    with op.batch_alter_table('dialectics_history', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_dialectics_history_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_dialectics_history_dialectics_id'), ['dialectics_id'], unique=False)

    with op.batch_alter_table('dialectics', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default='0'))
        batch_op.add_column(sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.create_index(batch_op.f('ix_dialectics_is_deleted'), ['is_deleted'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('dialectics', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_dialectics_is_deleted'))
        batch_op.drop_column('deleted_at')
        batch_op.drop_column('is_deleted')

    with op.batch_alter_table('dialectics_history', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_dialectics_history_dialectics_id'))
        batch_op.drop_index(batch_op.f('ix_dialectics_history_id'))

    op.drop_table('dialectics_history')
