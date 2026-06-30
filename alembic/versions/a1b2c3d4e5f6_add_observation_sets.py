"""add_observation_sets

Revision ID: a1b2c3d4e5f6
Revises: f65773643b91
Create Date: 2026-06-29 10:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f65773643b91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('observation_sets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('observation_sets', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_observation_sets_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_observation_sets_name'), ['name'], unique=False)

    with op.batch_alter_table('observations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('set_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_observations_set_id'), ['set_id'], unique=False)
        batch_op.create_foreign_key('fk_observations_set_id_observation_sets', 'observation_sets', ['set_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    with op.batch_alter_table('observations', schema=None) as batch_op:
        batch_op.drop_constraint('fk_observations_set_id_observation_sets', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_observations_set_id'))
        batch_op.drop_column('set_id')

    with op.batch_alter_table('observation_sets', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_observation_sets_name'))
        batch_op.drop_index(batch_op.f('ix_observation_sets_id'))

    op.drop_table('observation_sets')
