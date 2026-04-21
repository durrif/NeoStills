"""Add aging_vessels table for barrel and tank tracking

Revision ID: 005
Revises: 004
Create Date: 2025-01-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'aging_vessels',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),

        # Identificación
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(200), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),

        # Tipo de recipiente
        sa.Column('vessel_type', sa.String(50), nullable=False, server_default='barrel_new'),
        sa.Column('wood_type', sa.String(50), nullable=False, server_default='american_white_oak'),
        sa.Column('toast_level', sa.String(30), nullable=False, server_default='medium'),

        # Volumen y contenido
        sa.Column('capacity_liters', sa.Float(), nullable=False, server_default='200'),
        sa.Column('current_volume_liters', sa.Float(), nullable=False, server_default='0'),
        sa.Column('current_abv', sa.Float(), nullable=True),
        sa.Column('spirit_type', sa.String(100), nullable=True),
        sa.Column('spirit_name', sa.String(200), nullable=True),

        # Estado y fechas
        sa.Column('status', sa.String(30), nullable=False, server_default='empty'),
        sa.Column('fill_date', sa.Date(), nullable=True),
        sa.Column('target_date', sa.Date(), nullable=True),

        # Ubicación en la nave
        sa.Column('location_row', sa.String(10), nullable=True),
        sa.Column('location_position', sa.Integer(), nullable=True),
        sa.Column('location_notes', sa.String(200), nullable=True),

        # Datos JSON
        sa.Column('samplings', sa.Text(), nullable=True),          # JSON array
        sa.Column('aging_techniques', sa.Text(), nullable=True),   # JSON dict

        # Relaciones
        sa.Column('source_batch_id', sa.Integer(), nullable=True),
        sa.Column('distillery_id', sa.Integer(), nullable=False),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['distillery_id'], ['distilleries.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('distillery_id', 'code', name='uq_aging_vessel_code_per_distillery'),
    )

    op.create_index('ix_aging_vessels_distillery_id', 'aging_vessels', ['distillery_id'])
    op.create_index('ix_aging_vessels_status', 'aging_vessels', ['status'])


def downgrade():
    op.drop_index('ix_aging_vessels_status', table_name='aging_vessels')
    op.drop_index('ix_aging_vessels_distillery_id', table_name='aging_vessels')
    op.drop_table('aging_vessels')
