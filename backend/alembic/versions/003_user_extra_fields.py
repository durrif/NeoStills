"""Add missing user fields: preferred_language, invitation_token, invitation_expires_at, invited_by_id

Revision ID: 003
Revises: 002
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('preferred_language', sa.String(5), nullable=False, server_default='es'))
    op.add_column('users', sa.Column('invitation_token', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('invitation_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('invited_by_id', sa.Integer(), nullable=True))
    op.create_unique_constraint('uq_users_invitation_token', 'users', ['invitation_token'])


def downgrade() -> None:
    op.drop_constraint('uq_users_invitation_token', 'users', type_='unique')
    op.drop_column('users', 'invited_by_id')
    op.drop_column('users', 'invitation_expires_at')
    op.drop_column('users', 'invitation_token')
    op.drop_column('users', 'preferred_language')
